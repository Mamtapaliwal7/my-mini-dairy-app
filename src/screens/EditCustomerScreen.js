import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomerContext } from '../context/CustomerContext';
import { carryForwardBilling } from '../utils/billingUtils';

export default function EditCustomerScreen({ route, navigation }) {
  const { customers, updateCustomer, updateMonthlyBilling } = useContext(CustomerContext);

  // Get customer ID from params and always get latest customer from context
  const customerId = route.params.customer.id;
  const customer = customers.find(c => c.id === customerId);

  // If customer not found (e.g., deleted), show a message
  if (!customer) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Customer not found.</Text>
      </View>
    );
  }

  const now = new Date();
  const billingKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const monthlyBilling = { ...customer.monthlyBilling };
  const currentBilling = monthlyBilling[billingKey] || {};

  // State for editable fields, always sync with latest customer
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || '');
  const [milkPrice, setMilkPrice] = useState(
    currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null
      ? currentBilling.milkPrice.toString()
      : ''
  );
  console.log('EditCustomerScreen init:', { billingKey, milkPrice: currentBilling.milkPrice, currentBilling });
  const [address, setAddress] = useState(customer.address || '');
  const [pending, setPending] = useState(
    currentBilling.pending !== undefined
      ? String(currentBilling.pending)
      : customer.pending || ''
  );
  const [advance, setAdvance] = useState(
    currentBilling.advance !== undefined
      ? String(currentBilling.advance)
      : customer.advance || ''
  );
  const [paidAmount, setPaidAmount] = useState(
    currentBilling.paidAmount !== undefined
      ? String(currentBilling.paidAmount)
      : customer.paidAmount || ''
  );

  // Sync state with latest customer if it changes
  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone || '');
    setMilkPrice(
      currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null
        ? currentBilling.milkPrice.toString()
        : ''
    );
    console.log('EditCustomerScreen useEffect:', { billingKey, milkPrice: currentBilling.milkPrice, currentBilling });
    setAddress(customer.address || '');
    setPending(
      currentBilling.pending !== undefined
        ? String(currentBilling.pending)
        : customer.pending || ''
    );
    setAdvance(
      currentBilling.advance !== undefined
        ? String(currentBilling.advance)
        : customer.advance || ''
    );
    setPaidAmount(
      currentBilling.paidAmount !== undefined
        ? String(currentBilling.paidAmount)
        : customer.paidAmount || ''
    );
  }, [customer]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer name cannot be empty.');
      return;
    }
    try {
      const now = new Date();
      const billingKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      const monthlyBilling = { ...customer.monthlyBilling };
      const currentBilling = monthlyBilling[billingKey] || {};
      const userBilling = {
        advance: parseFloat(advance) || 0,
        pending: parseFloat(pending) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        entries: (customer.entries || []).filter(e => {
          const d = new Date(e.date);
          return d.getMonth() + 1 === now.getMonth() + 1 && d.getFullYear() === now.getFullYear();
        }),
        milkPrice: parseFloat(milkPrice) || 0,
      };
      const newMonthlyBilling = carryForwardBilling(
        monthlyBilling,
        now.getMonth() + 1,
        now.getFullYear(),
        userBilling
      );
      const updatedCustomer = {
        ...customer,
        name,
        phone,
        address,
        milkPrice: parseFloat(milkPrice) || 0,
        monthlyBilling: newMonthlyBilling,
      };
      await updateCustomer(updatedCustomer);
      Alert.alert('Success', 'Customer updated successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error.message || 'Could not update customer details. Please try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit {customer.name}'s Info</Text>

        <Text style={styles.label}>👤 Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>📞 Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Enter phone number"
        />

        <Text style={styles.label}>💰 Milk Price</Text>
        <TextInput
          style={styles.input}
          value={milkPrice}
          onChangeText={setMilkPrice}
          keyboardType="numeric"
          placeholder="Enter milk price"
        />

        <Text style={styles.label}>🏠 Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter address"
        />

        <Text style={styles.label}>🧾 Pending</Text>
        <TextInput
          style={styles.input}
          value={pending}
          onChangeText={setPending}
          keyboardType="numeric"
          placeholder="Enter pending amount"
        />

        <Text style={styles.label}>💸 Advance</Text>
        <TextInput
          style={styles.input}
          value={advance}
          onChangeText={setAdvance}
          keyboardType="numeric"
          placeholder="Enter advance amount"
        />

        <Text style={styles.label}>💵 Paid Amount</Text>
        <TextInput
          style={styles.input}
          value={paidAmount}
          onChangeText={setPaidAmount}
          keyboardType="numeric"
          placeholder="Enter paid amount"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
          <Text style={styles.saveButtonText}>💾 Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 30,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f6f8b',
  },
  label: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
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
    placeholderTextColor: '#888',
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#1f6f8b',
    padding: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
});
