import React, { useState, useContext, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { CustomerContext } from '../context/CustomerContext';
import { useFocusEffect } from '@react-navigation/native';

export default function AddCustomerScreen({ navigation }) {
  const { addCustomer } = useContext(CustomerContext);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [milkPrice, setMilkPrice] = useState('');
  const [advance, setAdvance] = useState('');
  const [pending, setPending] = useState('');
  const [address, setAddress] = useState('');

  // Reset all fields when the screen is focused
  useFocusEffect(
    useCallback(() => {
      setName('');
      setPhone('');
      setMilkPrice('');
      setAdvance('');
      setPending('');
      setAddress('');
    }, [])
  );

  const handleAdd = async () => {
    if (name.trim()) {
      const now = new Date();
      const billingKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      const parsedMilkPrice = parseFloat(milkPrice) || 0;
      const monthlyBilling = {
        [billingKey]: {
          advance: parseFloat(advance) || 0,
          pending: parseFloat(pending) || 0,
          milkPrice: parsedMilkPrice,
        }
      };
      const newCust = {
        name,
        phone,
        milkPrice: parsedMilkPrice,
        address,
        entries: [],
        monthlyBilling,
      };
      await addCustomer(newCust);

      // Optionally reset fields here too (if you want to stay on the screen after adding)
      setName('');
      setPhone('');
      setMilkPrice('');
      setAdvance('');
      setPending('');
      setAddress('');

      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Milk Price (₹)"
        keyboardType="numeric"
        value={milkPrice}
        onChangeText={setMilkPrice}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Advance Amount"
        keyboardType="numeric"
        value={advance}
        onChangeText={setAdvance}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Pending Amount"
        keyboardType="numeric"
        value={pending}
        onChangeText={setPending}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        style={[styles.input, { color: '#222' }]}
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.bigButtonPrimary} onPress={handleAdd}>
        <Text style={styles.bigButtonText}>➕ Add Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bigButtonSecondary}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.bigButtonText}>❌ Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f9f9f9' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f6f8b',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    padding: 10,
    fontSize: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#222',
  },
  bigButtonPrimary: {
    backgroundColor: '#1f6f8b',
    paddingVertical: 18,
    borderRadius: 112,
    alignItems: 'center',
    marginBottom: 10,
  },
  bigButtonSecondary: {
    backgroundColor: '#d9534f',
    paddingVertical: 18,
    borderRadius: 112,
    alignItems: 'center',
  },
  bigButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 30,
  },
});
