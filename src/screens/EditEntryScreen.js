import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CustomerContext } from '../context/CustomerContext';

export default function EditEntryScreen({ route, navigation }) {
  const { entry, customer } = route.params;
  const { updateCustomer } = useContext(CustomerContext);

  const [morning, setMorning] = useState(entry.morning.toString());
  const [evening, setEvening] = useState(entry.evening.toString());

  const handleSave = async () => {
    const updatedEntry = {
      ...entry,
      morning: parseFloat(morning) || 0,
      evening: parseFloat(evening) || 0,
    };

    const updatedEntries = (customer.entries || []).map(e =>
      e.date === entry.date ? updatedEntry : e
    );

    const updatedCustomer = {
      ...customer,
      entries: updatedEntries,
    };

    await updateCustomer(updatedCustomer);
    
    Alert.alert("Success", "Milk entry updated.");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✏️ Edit Milk Entry</Text>
      <Text style={styles.date}>📅 {entry.date}</Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={morning}
        onChangeText={setMorning}
        placeholder="Morning Milk (L)"
      />

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={evening}
        onChangeText={setEvening}
        placeholder="Evening Milk (L)"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>💾 Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>❌ Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 40, backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#1f6f8b', marginBottom: 10 },
  date: { fontSize: 25, color: '#555', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 110,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#d9534f',
    padding: 15,
    borderRadius: 110,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 30 },
});
