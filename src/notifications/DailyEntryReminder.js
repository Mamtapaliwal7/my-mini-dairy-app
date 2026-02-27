import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CustomerContext } from '../context/CustomerContext';
import React, { useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper functions
function getTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    day: now.getDate(),
    lastDayOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  };
}

// Storage keys
const NOTIFICATION_KEYS = {
  PRICE_CHECK: 'last_price_check_date',
  FIRST_ENTRY_CHECK: 'last_first_entry_check',
  SECOND_ENTRY_CHECK: 'last_second_entry_check',
  MONTHLY_REMINDER: 'last_monthly_reminder',
  PRICE_CHECK_DONE_ONCE: 'price_check_done_once'
};

// Reset notification counters daily
async function resetNotificationCounters() {
  const now = new Date();
  const lastReset = await AsyncStorage.getItem('last_notification_reset');
  if (!lastReset || new Date(lastReset).toDateString() !== now.toDateString()) {
    for (const key of Object.values(NOTIFICATION_KEYS)) {
      await AsyncStorage.removeItem(`${key}_count`);
    }
    await AsyncStorage.setItem('last_notification_reset', now.toISOString());
  }
}

// Generic rate-limiter
async function shouldShowNotification(key, maxTimesPerDay = 1) {
  try {
    const lastCheck = await AsyncStorage.getItem(key);
    const now = new Date();

    if (!lastCheck || new Date(lastCheck).toDateString() !== now.toDateString()) {
      await AsyncStorage.setItem(`${key}_count`, '1');
      await AsyncStorage.setItem(key, now.toISOString());
      return true;
    }

    const timesShown = parseInt(await AsyncStorage.getItem(`${key}_count`) || '0');
    if (timesShown < maxTimesPerDay) {
      await AsyncStorage.setItem(`${key}_count`, (timesShown + 1).toString());
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

// Missing Milk Prices Alert
async function checkMissingPrices(customers) {
  const alreadyChecked = await AsyncStorage.getItem(NOTIFICATION_KEYS.PRICE_CHECK_DONE_ONCE);
  if (alreadyChecked) return;

  const { month, year } = getCurrentMonthYear();
  const billingKey = `${year}-${month}`;
  const missing = customers.filter(c => {
    const monthlyBilling = c.monthlyBilling || {};
    const currentBilling = monthlyBilling[billingKey] || {};
    return !currentBilling.milkPrice || currentBilling.milkPrice <= 0;
  });
  if (missing.length > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Missing Milk Prices',
        body: `Set milk price for: ${missing.map(c => c.name).join(', ')}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'missing_prices' }
      },
      trigger: null,
    });
    await AsyncStorage.setItem(NOTIFICATION_KEYS.PRICE_CHECK_DONE_ONCE, 'true');
  }
}

// Missing Milk Entries Reminder (7 PM and 9 PM)
async function checkMissingEntries(customers) {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  let key = '';

  if (hour === 19 && minute < 30) {
    key = NOTIFICATION_KEYS.FIRST_ENTRY_CHECK;
  } else if (hour === 21 && minute < 30) {
    key = NOTIFICATION_KEYS.SECOND_ENTRY_CHECK;
  } else {
    return;
  }

  if (!await shouldShowNotification(key)) return;

  const today = getTodayISO();
  const missing = customers.filter(c => {
    const entry = (c.entries || []).find(e => e.date === today);
    return !entry || (!entry.morning && !entry.evening);
  });

  if (missing.length > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❌ Missing Entries',
        body: `Milk data missing for: ${missing.map(c => c.name).join(', ')}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'missing_entries' },
      },
      trigger: null,
    });
    await AsyncStorage.setItem(key, new Date().toISOString());
  }
}

// Monthly Summary Reminder (last 2 days of month)
async function checkMonthlySummaryReminder() {
  const { day, lastDayOfMonth } = getCurrentMonthYear();
  const key = NOTIFICATION_KEYS.MONTHLY_REMINDER;

  if (day !== lastDayOfMonth && day !== lastDayOfMonth - 1) return;
  if (!await shouldShowNotification(key)) return;

  const isLastDay = day === lastDayOfMonth;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Monthly Summary Reminder',
      body: isLastDay ? 'Today is the last day of the month! Finalize your summary.' : 'Prepare your monthly summary. Only 1 day left!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'monthly_summary' },
    },
    trigger: null,
  });
  await AsyncStorage.setItem(key, new Date().toISOString());
}

// Daily Entry Reminders (user-defined times)
export async function setupDailyEntryReminders(times = [{ hour: 20, minute: 0 }]) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;

    for (const t of times) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🥛 Daily Entry Reminder',
          body: 'Time to fill milk data!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'daily_reminder' },
        },
        trigger: {
          hour: t.hour,
          minute: t.minute,
          repeats: true,
        },
      });
    }

    return true;
  } catch (e) {
    return false;
  }
}

// React hook to auto-schedule reminders when user sets time
export function useRescheduleEntryReminders() {
  const { notificationTimes } = useContext(CustomerContext);
  const prevTimesRef = useRef();

  useEffect(() => {
    const timesString = JSON.stringify(notificationTimes);
    if (prevTimesRef.current === timesString) return;
    prevTimesRef.current = timesString;

    const times = notificationTimes?.length ? notificationTimes : [{ hour: 20, minute: 0 }];
    setupDailyEntryReminders(times);
  }, [notificationTimes]);
}

// 🔔 MAIN HOOK: Checks everything
export function useCheckAllNotifications() {
  const { customers } = useContext(CustomerContext);

  useEffect(() => {
    const runChecks = async () => {
      await resetNotificationCounters();
      await checkMissingPrices(customers);
      await checkMissingEntries(customers);
      await checkMonthlySummaryReminder();
    };

    // Check immediately on app start
    runChecks();

    // Also check at fixed times (every minute)
    const intervalId = setInterval(() => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      if ((h === 19 && m === 0) || (h === 21 && m === 0)) {
        runChecks();
      }
    }, 60000);

    // Listener to recheck when app receives notification
    const listener = Notifications.addNotificationReceivedListener(n => {
      if (n.request.content.data?.type === 'daily_reminder') {
        runChecks();
      }
    });

    return () => {
      clearInterval(intervalId);
      listener.remove();
    };
  }, [customers]);
}

// Legacy alias
export const useCheckMissingEntriesAndNotify = useCheckAllNotifications;
