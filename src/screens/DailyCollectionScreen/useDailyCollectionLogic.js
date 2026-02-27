import { useState, useEffect } from 'react';
import { CustomerContext } from '../../context/CustomerContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useContext } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const useDailyCollection = () => {
  const { customers, updateCustomer } = useContext(CustomerContext);
  const [searchText, setSearchText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [milkQuantity, setMilkQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  // Get current date information
  const now = new Date();
  const currentDate = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Filter customers based on search text
  const filteredCustomers = customers.filter(customer =>
    customer.syncStatus !== 'deleted' && customer.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedCustomer || !milkQuantity) {
      Alert.alert('Error', 'Please select a customer and enter milk quantity');
      return;
    }

    try {
      setLoading(true);
      const quantity = parseFloat(milkQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('Error', 'Please enter a valid milk quantity');
        return;
      }

      // Get existing data for the current month
      const monthKey = `milkData_${currentYear}_${currentMonth}`;
      const existingData = await AsyncStorage.getItem(monthKey);
      const monthData = existingData ? JSON.parse(existingData) : {};

      // Update or create customer data
      if (!monthData[selectedCustomer.id]) {
        monthData[selectedCustomer.id] = {
          name: selectedCustomer.name,
          milkPrice: selectedCustomer.milkPrice,
          dateLiters: Array(31).fill(0),
          totalLiters: 0,
          totalAmount: 0,
          advance: selectedCustomer.advance || 0,
          pending: selectedCustomer.pending || 0,
          paidAmount: 0,
          due: 0
        };
      }

      // Update the specific date's data
      monthData[selectedCustomer.id].dateLiters[currentDate - 1] = quantity;

      // Recalculate totals
      const customerData = monthData[selectedCustomer.id];
      customerData.totalLiters = customerData.dateLiters.reduce((sum, val) => sum + val, 0);
      customerData.totalAmount = customerData.totalLiters * customerData.milkPrice;
      customerData.due = customerData.totalAmount + customerData.pending - customerData.advance - customerData.paidAmount;

      // Save updated data
      await AsyncStorage.setItem(monthKey, JSON.stringify(monthData));

      // Clear form
      setMilkQuantity('');
      setSelectedCustomer(null);
      setSearchText('');

      Alert.alert('Success', 'Daily collection saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save daily collection');
    } finally {
      setLoading(false);
    }
  };

  return {
    searchText,
    setSearchText,
    filteredCustomers,
    selectedCustomer,
    setSelectedCustomer,
    milkQuantity,
    setMilkQuantity,
    currentDate,
    currentMonth,
    currentYear,
    handleSave,
    loading,
    MONTHS
  };
}; 