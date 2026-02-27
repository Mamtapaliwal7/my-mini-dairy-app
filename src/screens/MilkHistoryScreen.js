import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomerContext } from '../context/CustomerContext';

const getMonthName = (monthIndex) =>
  [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December',
  ][monthIndex - 1];

export default function MilkHistoryScreen({ route }) {
  const {
    entries,
    customerName,
    customer,
  } = route.params;

  const navigation = useNavigation();
  const { customers } = useContext(CustomerContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalVisible, setModalVisible] = useState(false);

  // Get the latest customer data from context
  const currentCustomer = customers.find(c => c.id === customer?.id) || customer;

  // Get billing data for selected month
  const billingKey = `${selectedYear}-${selectedMonth}`;
  const monthlyBilling = currentCustomer?.monthlyBilling?.[billingKey] || {};
  const safeMilkPrice = monthlyBilling.milkPrice !== undefined && monthlyBilling.milkPrice !== null && monthlyBilling.milkPrice !== ''
    ? Number(monthlyBilling.milkPrice)
    : (currentCustomer?.milkPrice ? Number(currentCustomer.milkPrice) : 0);
  const safeAdvance = Number(monthlyBilling.advance) || 0;
  const safePending = Number(monthlyBilling.pending) || 0;
  const safePaidAmount = Number(monthlyBilling.paidAmount) || 0;

  // Filter entries based on selected month and year
  const filteredEntries = (currentCustomer?.entries || entries || []).filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear;
  });
  

  // Calculate totals
  const totalMorning = filteredEntries.reduce((sum, e) => sum + (e.morning || 0), 0);
  const totalEvening = filteredEntries.reduce((sum, e) => sum + (e.evening || 0), 0);
  const totalLitres = totalMorning + totalEvening;
  const totalAmount = totalLitres * safeMilkPrice;
  const finalDue = totalAmount - safeAdvance + safePending - safePaidAmount;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Milk History for {customerName}</Text>

      {/* Month/Year Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={styles.monthSelector}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.monthSelectorText}>{getMonthName(selectedMonth)} {selectedYear}</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Totals */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>🌅 Morning: {totalMorning.toFixed(2)} L</Text>
        <Text style={styles.totalText}>🌇 Evening: {totalEvening.toFixed(2)} L</Text>
        <Text style={styles.totalText}>🧮 Total: {totalLitres.toFixed(2)} L</Text>
        <Text style={styles.totalText}>💰 Rate: ₹{safeMilkPrice}/L</Text>
        <Text style={styles.totalText}>💵 Total Milk Amount: ₹{totalAmount.toFixed(2)}</Text>
        <Text style={styles.totalText}>💸 Advance Paid: ₹{safeAdvance.toFixed(2)}</Text>
        <Text style={styles.totalText}>📄 Pending (Last Month): ₹{safePending.toFixed(2)}</Text>
        <Text style={styles.totalText}>💵 Paid Amount: ₹{safePaidAmount.toFixed(2)}</Text>
        <Text style={styles.finalDue}>Final Due: ₹{finalDue.toFixed(2)}</Text>
      </View>

      {/* Entry List */}
      {filteredEntries.length === 0 ? (
        <Text style={styles.noData}>No entries for this month.</Text>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.entryCard}
              onPress={() =>
                navigation.navigate('EditEntry', {
                  entry: item,
                  customer: currentCustomer,
                })
              }
            >
              <Text style={styles.date}>📅 {item.date}</Text>
              <Text>🌅 Morning: {item.morning} L</Text>
              <Text>🌇 Evening: {item.evening} L</Text>
              <Text>🧮 Total: {(item.morning + item.evening).toFixed(2)} L</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal for Month Picker */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {Array.from({ length: 12 }, (_, i) => (
              <Pressable
                key={i}
                style={styles.monthOption}
                onPress={() => {
                  setSelectedMonth(i + 1);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.monthOptionText}>{getMonthName(i + 1)}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.monthOption, { backgroundColor: '#ccc' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.monthOptionText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 35, backgroundColor: '#fff' },
  title: { fontSize: 25, fontWeight: 'bold', color: '#1f6f8b', marginBottom: 2 },
  noData: { fontSize: 20, color: '#999', marginTop: 20, textAlign: 'center' },
  entryCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    marginBottom: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#1f6f8b',
  },
  date: { fontWeight: 'bold', fontSize: 25, marginBottom: 5 },
  totalContainer: {
    backgroundColor: '#e8f4fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  totalText: { fontSize: 15, fontWeight: '600', color: '#333' },
  finalDue: {
    marginTop: 0.1,
    fontSize: 25,
    fontWeight: 'bold',
    color: '#d9534f',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthSelector: {
    backgroundColor: '#1f6f8b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 500,
  },
  monthSelectorText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000000aa',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  monthOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  monthOptionText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
