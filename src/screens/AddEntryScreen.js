import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CustomerContext } from '../context/CustomerContext';

function getTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

export default function AddEntryScreen({ route, navigation }) {
  const { customer } = route.params;
  const { updateCustomer } = useContext(CustomerContext);

  const [morning, setMorning] = useState('');
  const [evening, setEvening] = useState('');

  const today = getTodayISO();

  const handleSave = async () => {
    const morningLitres = parseFloat(morning || 0);
    const eveningLitres = parseFloat(evening || 0);

    if (morningLitres === 0 && eveningLitres === 0) {
      return Alert.alert("⚠️ Missing Data", "Enter at least one value.");
    }

    // Check if entry already exists for today
    const existingEntries = customer.entries || [];
    const alreadyExists = existingEntries.some((e) => e.date === today);

    if (alreadyExists) {
      return Alert.alert("⚠️ Duplicate Entry", "Entry already exists for today.");
    }

    const newEntry = {
      date: today,
      morning: morningLitres,
      evening: eveningLitres,
    };

    const updatedCustomer = {
      ...customer,
      entries: [...existingEntries, newEntry],
    };

    await updateCustomer(updatedCustomer);
    Alert.alert("✅ Entry Saved", "Milk entry added successfully.");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗓️ Add Entry for {customer.name}</Text>

      <TextInput
        placeholder="Morning Milk (litres)"
        keyboardType="numeric"
        value={morning}
        onChangeText={setMorning}
        style={styles.input}
      />

      <TextInput
        placeholder="Evening Milk (litres)"
        keyboardType="numeric"
        value={evening}
        onChangeText={setEvening}
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Save Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  btn: {
    backgroundColor: '#1f6f8b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
