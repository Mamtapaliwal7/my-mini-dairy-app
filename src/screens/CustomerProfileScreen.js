import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { CustomerContext } from '../context/CustomerContext';

export default function CustomerProfileScreen({ route, navigation }) {
  const { customers, deleteCustomer } = useContext(CustomerContext);
  // Get customer ID from params
  const customerId = route.params?.customer?.id || route.params?.customerId;
  const customer = customers.find(c => c.id === customerId);

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>❌ Customer not found or may have been deleted.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.editButtonText}>⬅️ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date();
  const billingKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
  const monthlyBilling = customer.monthlyBilling?.[billingKey] || {};
  const milkPrice = monthlyBilling.milkPrice !== undefined ? monthlyBilling.milkPrice : 0;
  console.log('CustomerProfileScreen:', { billingKey, milkPrice, monthlyBilling });

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomer(customer.id);
            Alert.alert('✅ Deleted', `${customer.name} has been deleted.`);
            navigation.navigate('Dashboard');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      <Text style={styles.title}>{customer.name}'s Profile</Text>
      <Text style={styles.detail}>🆔 ID: {customer.id}</Text>
      <Text style={styles.detail}>📞 Phone: {customer.phone || 'N/A'}</Text>
      <Text style={styles.detail}>💰 Milk Price: ₹{milkPrice}</Text>
      <Text style={styles.detail}>💸 Pending: ₹{monthlyBilling.pending ?? customer.pending ?? 0}</Text>
      <Text style={styles.detail}>💸 Advance: ₹{monthlyBilling.advance ?? customer.advance ?? 0}</Text>
      <Text style={styles.detail}>💸 Paid: ₹{monthlyBilling.paidAmount ?? customer.paidAmount ?? 0}</Text>
      <Text style={styles.detail}>📍 Address: {customer.address || 'N/A'}</Text>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditCustomer', { customer: { id: customer.id } })}
      >
        <Text style={styles.editButtonText}>✏️ Edit Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>🗑️ Delete Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.viewHistoryButton}
        onPress={() =>
          navigation.navigate('MilkHistory', {
            customer: { id: customer.id },
            customerName: customer.name,
            entries: customer.entries || [],
          })
        }
      >
        <Text style={styles.editButtonText}>📜 View Milk History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.editButtonText}>⬅️ Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f6f8b',
  },
  detail: {
    fontSize: 20,
    marginBottom: 10,
  },
  editButton: {
    marginTop: 10,
    backgroundColor: '#1f6f8b',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#d9534f',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  viewHistoryButton: {
    marginTop: 10,
    backgroundColor: '#4caf50',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  backButton: {
    marginTop: 10,
    backgroundColor: '#888',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
