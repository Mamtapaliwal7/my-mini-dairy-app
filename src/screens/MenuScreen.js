import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const MENU_ITEMS = [
  { name: 'Dashboard', screen: 'Dashboard', icon: 'home-outline' },
  { name: 'My Profile', screen: 'MyProfile', icon: 'person-outline' },
  { name: 'Daily Milk Collection', screen: 'DailyCollection', icon: 'clipboard-outline' },
  { name: 'Monthly Milk Ledger', screen: 'MonthlyMilkLedger', icon: 'document-text-outline' },
  { name: 'Register (Old)', screen: 'Register', icon: 'book-outline' },
  { name: 'Register (Test)', screen: 'RegisterTest', icon: 'book-outline' },
  { name: 'Customer Summary', screen: 'CustomerSummary', icon: 'file-tray-full-outline' },
  { name: 'Add Customer', screen: 'AddCustomer', icon: 'add-outline' },
  { name: 'Delete Customers', screen: 'DeleteCustomers', icon: 'trash-outline' },
];

export default function MenuScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Menu</Text>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={24} color="#007AFF" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
