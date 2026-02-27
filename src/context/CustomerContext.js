// context/CustomerContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncCustomersWithFirebase } from '../firebase/SyncManager';

export const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [companyName, setCompanyNameState] = useState('');
  const [notificationTimes, setNotificationTimesState] = useState([]); // array of {hour, minute}
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error'

  useEffect(() => {
    loadCustomers();
    loadCompanyName();
    loadNotificationTimes();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await AsyncStorage.getItem('customers');
      if (data) {
        try {
          setCustomers(JSON.parse(data));
        } catch (parseErr) {
          setCustomers([]);
          Alert.alert('Load Error', 'Corrupted customer data.');
        }
      }
    } catch (e) {
      Alert.alert('Load Error', 'Failed to load local customer data.');
    }
  };

  const saveCustomers = async (newData) => {
    try {
      setCustomers(newData);
      await AsyncStorage.setItem('customers', JSON.stringify(newData));
    } catch (e) {
      // Re-throw so the caller can handle it with an Alert
      throw new Error('Failed to save data to local storage.');
    }
  };

  const addCustomer = async (newCustomer) => {
    if (!newCustomer.id) {
      newCustomer.id = Date.now().toString();
    }
    newCustomer.syncStatus = 'new';
    const updated = [...customers, newCustomer];
    await saveCustomers(updated);
  };

  const updateCustomer = async (updatedCustomer) => {
    const updated = customers.map((cust) =>
      cust.id === updatedCustomer.id ? {
        ...updatedCustomer,
        syncStatus: cust.syncStatus === 'new' ? 'new' : 'updated',
      } : cust
    );
    await saveCustomers(updated);
  };

  const updateMonthlyBilling = async (customerId, year, month, updatedBilling) => {
    const billingKey = `${year}-${month}`;
    const updated = customers.map((cust) => {
      if (cust.id !== customerId) return cust;
        const monthlyBilling = {
          ...(cust.monthlyBilling || {}),
          [billingKey]: {
            ...(cust.monthlyBilling?.[billingKey] || {}),
            ...updatedBilling,
          },
        };
        return {
          ...cust,
          monthlyBilling,
        syncStatus: cust.syncStatus === 'new' ? 'new' : 'updated',
        };
      });
    setCustomers(updated);
    await AsyncStorage.setItem('customers', JSON.stringify(updated));
  };

  const setCompanyName = (name) => {
    setCompanyNameState(name);
    AsyncStorage.setItem('companyName', name);
  };

  const loadCompanyName = async () => {
    try {
      const name = await AsyncStorage.getItem('companyName');
      if (name) setCompanyNameState(name);
    } catch (e) {
      // Silent fail for production
    }
  };

  const deleteCustomer = async (customerId) => {
    const updated = customers.filter(c => {
      if (c.id === customerId) {
        return c.syncStatus !== 'new';
      }
      return true;
    }).map(c => {
      if (c.id === customerId) {
        return { ...c, syncStatus: 'deleted' };
      }
      return c;
    });
  
    await saveCustomers(updated);
    return true;
  };
  
  const deleteMultipleCustomers = async (customerIds) => {
    try {
      const updated = customers.filter(c => {
        if (customerIds.includes(c.id)) {
          return c.syncStatus !== 'new';
        }
        return true;
      }).map(c => {
        if (customerIds.includes(c.id)) {
          return { ...c, syncStatus: 'deleted' };
        }
        return c;
      });
  
      await saveCustomers(updated);
      return true;
    } catch (error) {
      // Silent fail for production
      throw error;
    }
  };

  const setNotificationTimes = async (times) => {
    setNotificationTimesState(times);
    await AsyncStorage.setItem('notificationTimes', JSON.stringify(times));
  };

  const loadNotificationTimes = async () => {
    try {
      const times = await AsyncStorage.getItem('notificationTimes');
      if (times) setNotificationTimesState(JSON.parse(times));
    } catch (e) {
      // Silent fail for production
    }
  };

  const syncAll = async (userId) => {
    setSyncStatus('syncing');
    try {
      const result = await syncCustomersWithFirebase(userId);
      setSyncStatus(result.success ? 'success' : 'error');
      return result.success;
    } catch (e) {
      setSyncStatus('error');
      Alert.alert('Sync Error', 'An unexpected error occurred during sync. Please try again.');
      return false;
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        addCustomer,
        setCustomers,
        updateCustomer,
        updateMonthlyBilling,
        deleteCustomer,
        deleteMultipleCustomers,
        companyName,
        setCompanyName,
        notificationTimes,
        setNotificationTimes,
        syncStatus,
        syncAll,
        loadCustomers
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};
