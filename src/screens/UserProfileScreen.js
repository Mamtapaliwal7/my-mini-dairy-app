// screens/UserProfileScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  FlatList, Platform, ScrollView
} from 'react-native';
import { CustomerContext } from '../context/CustomerContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRescheduleEntryReminders } from '../notifications/DailyEntryReminder';
import { downloadCustomersFromFirebase } from '../firebase/downloadFromCloud';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserProfileScreen({ navigation }) {
  const { customers, updateCustomer, setCustomers, companyName, setCompanyName, notificationTimes, setNotificationTimes, loadCustomers } = useContext(CustomerContext);
  const { user, logout } = useAuth();

  const [nameInput, setNameInput] = useState(companyName || '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newTime, setNewTime] = useState(new Date());
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);

  useEffect(() => {
    setNameInput(companyName);
  }, [companyName]);

  useRescheduleEntryReminders();

  const handleSave = async () => {
    if (nameInput.trim()) {
      setCompanyName(nameInput.trim());
      Alert.alert('✅ Saved', 'Company name updated successfully!');
    } else {
      Alert.alert('❌ Error', 'Please enter a company name.');
    }
  };

  const handleAddTime = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      if (!notificationTimes.some(t => t.hour === hour && t.minute === minute)) {
        setNotificationTimes([...notificationTimes, { hour, minute }]);
      } else {
        Alert.alert('Duplicate', 'This time is already added.');
      }
    }
  };

  const handleRemoveTime = (idx) => {
    const updated = [...notificationTimes];
    updated.splice(idx, 1);
    setNotificationTimes(updated);
  };

  const formatTime = (hour, minute) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout },
    ]);
  };

  const handleDownloadFromCloud = async () => {
    if (loadingDownload) return; // Prevent double click
    setLoadingDownload(true);
    try {
      if (!user?.uid) {
        Alert.alert('⚠️ Not logged in', 'You must be logged in to download data.');
        return;
      }
      const result = await downloadCustomersFromFirebase(user.uid);
      if (result.success) {
        if (typeof loadCustomers === 'function') {
          await loadCustomers(); // Always refresh from AsyncStorage after download
        } else {
        const data = await AsyncStorage.getItem('customers');
        if (data) setCustomers(JSON.parse(data));
        }
        Alert.alert('✅ Downloaded', `Downloaded ${result.count} customers from cloud.`);
      } else {
        Alert.alert('❌ Error', 'Failed to download from cloud.');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'An unexpected error occurred.');
    } finally {
      setLoadingDownload(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>👤</Text>

        <Text style={styles.label}>🏢 Business Name:⬇</Text>
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Enter company name for invoice and summary generation"
          style={styles.input}
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>💾 Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleDownloadFromCloud} disabled={loadingDownload}>
          <Text style={styles.saveText}>{loadingDownload ? 'Downloading...' : '☁️ Download from Cloud'}</Text>
        </TouchableOpacity>

        {/* Notification Times Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Milk Entry Reminders</Text>
          <FlatList
            scrollEnabled={false} // ✅ prevent nested scroll issue
            data={notificationTimes}
            keyExtractor={(item, idx) => `${item.hour}:${item.minute}`}
            renderItem={({ item, index }) => (
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(item.hour, item.minute)}</Text>
                <TouchableOpacity onPress={() => handleRemoveTime(index)}>
                  <Ionicons name="trash" size={22} color="#d9534f" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No reminders set.</Text>}
          />

          <TouchableOpacity style={styles.addTimeButton} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="add-circle" size={22} color="#0275d8" />
            <Text style={styles.addTimeText}>Add Reminder Time</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={newTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleAddTime}
            />
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 40,
    alignSelf: 'center',
    marginBottom: 0,
    color: '#1f6f8b',
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 1,
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    padding: 10,
    fontSize: 18,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#222',
  },
  saveButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#0275d8',
    borderRadius: 118,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 25,
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginTop: 10,
    marginBottom: 1,
    padding: 16,
    backgroundColor: '#f5faff',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0275d8',
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  timeText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addTimeText: {
    color: '#0275d8',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#d9534f',
    borderRadius: 118,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 25,
    color: '#fff',
    fontWeight: 'bold',
  },
});
