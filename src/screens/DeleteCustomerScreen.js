import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomerContext } from '../context/CustomerContext';

export default function DeleteCustomerScreen() {
  const { customers, deleteMultipleCustomers } = useContext(CustomerContext);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Filter customers based on search text
  const filteredCustomers = customers.filter(c => 
    c.syncStatus !== 'deleted' && 
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Calculate total due for a customer
  const calculateTotalDue = (customer) => {
    const today = new Date();
    const billingKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    const monthlyBilling = customer.monthlyBilling?.[billingKey] || {};
    const paidAmount = Number(monthlyBilling.paidAmount) || 0;
    const advance = Number(monthlyBilling.advance) || 0;
    const pending = Number(monthlyBilling.pending) || 0;
    const entries = (customer.entries || []).filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === today.getMonth() + 1 && d.getFullYear() === today.getFullYear();
    });
    const totalMilk = entries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
    const price = Number(customer.milkPrice) || 0;
    const amount = totalMilk * price;
    return amount - advance + pending - paidAmount;
  };

  // Toggle customer selection
  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) {
      Alert.alert('No Selection', 'Please select customers to delete');
      return;
    }

    if (isDeleting) return; // Prevent multiple delete operations

    //const totalDue = selectedCustomers.reduce((sum, customerId) => sum + calculateTotalDue({ id: customerId }), 0);
const totalDue = selectedCustomers.reduce((sum, customerId) => {
  const customer = customers.find(c => c.id === customerId);
  return sum + (customer ? calculateTotalDue(customer) : 0);
}, 0);

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedCustomers.length} customer(s) with total due of ₹${totalDue.toFixed(2)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              // Use the new bulk delete function
              await deleteMultipleCustomers(selectedCustomers);

              // Clear selection after successful deletion
              setSelectedCustomers([]);
              Alert.alert('Success', `${selectedCustomers.length} customer(s) have been deleted successfully`);
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete customers. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Clear search
  const clearSearch = () => {
    setSearchText('');
  };

  // Render customer item
  const renderCustomerItem = ({ item }) => {
    const isSelected = selectedCustomers.includes(item.id);
    const totalDue = calculateTotalDue(item);

    return (
      <TouchableOpacity
        style={[
          styles.customerItem,
          isSelected && styles.selectedItem
        ]}
        onPress={() => toggleCustomerSelection(item.id)}
      >
        <View style={[
          styles.itemContent,
          isSelected && styles.selectedItemContent
        ]}>
          <View style={styles.customerInfo}>
            <View style={styles.nameContainer}>
              <MaterialCommunityIcons 
                name="cow" 
                size={24} 
                color={isSelected ? "#1976D2" : "#4A6572"} 
                style={styles.customerIcon}
              />
              <Text style={[
                styles.customerName,
                isSelected && styles.selectedCustomerName
              ]}>
                {item.name}
              </Text>
            </View>
            <View style={[
              styles.dueContainer,
              isSelected && styles.selectedDueContainer
            ]}>
              <MaterialCommunityIcons 
                name="currency-inr" 
                size={20} 
                color="#E53935" 
              />
              <Text style={styles.dueAmount}>{totalDue.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.selectionIndicator}>
            {isSelected && (
              <MaterialCommunityIcons 
                name="check-circle" 
                size={28} 
                color="#4CAF50" 
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons 
            name="account-remove" 
            size={32} 
            color="#4A6572" 
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Delete Customers</Text>
            <Text style={styles.subtitle}>Select customers to remove</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={24} 
            color="#78909C" 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#78909C"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <MaterialCommunityIcons 
                name="close-circle" 
                size={20} 
                color="#78909C" 
              />
            </TouchableOpacity>
          )}
        </View>
        {searchText.length > 0 && (
          <Text style={styles.searchResults}>
            {filteredCustomers.length} customer(s) found
          </Text>
        )}
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="account-search" 
              size={64} 
              color="#BDBDBD" 
            />
            <Text style={styles.emptyText}>
              {searchText.length > 0 
                ? `No customers found for "${searchText}"`
                : 'No customers available'
              }
            </Text>
          </View>
        }
      />

      {selectedCustomers.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.selectedInfo}>
              <MaterialCommunityIcons 
                name="account-group" 
                size={24} 
                color="#E53935" 
              />
              <Text style={styles.selectedCount}>
                {selectedCustomers.length} customer(s) selected
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                isDeleting && styles.deleteButtonDisabled
              ]}
              onPress={handleBulkDelete}
              disabled={isDeleting}
            >
              <View style={styles.deleteButtonContent}>
                {isDeleting ? (
                  <MaterialCommunityIcons 
                    name="loading" 
                    size={24} 
                    color="#FFFFFF" 
                    style={styles.deleteIcon}
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="delete" 
                    size={24} 
                    color="#FFFFFF" 
                    style={styles.deleteIcon}
                  />
                )}
                <Text style={styles.deleteButtonText}>
                  {isDeleting ?'Deleting...':'Delete Selected'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A6572',
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    marginTop: 2,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#4A6572',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    fontSize: 14,
    color: '#78909C',
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#BDBDBD',
    marginTop: 16,
    textAlign: 'center',
  },
  customerItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  selectedItemContent: {
    backgroundColor: '#E3F2FD',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerIcon: {
    marginRight: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A6572',
  },
  selectedCustomerName: {
    color: '#1976D2',
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedDueContainer: {
    backgroundColor: '#E8F5E9',
  },
  dueAmount: {
    fontSize: 16,
    color: '#E53935',
    fontWeight: '600',
    marginLeft: 4,
  },
  selectionIndicator: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 16,
    color: '#E53935',
    marginLeft: 8,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#E53935',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  deleteIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonDisabled: {
    backgroundColor: '#B71C1C',
    opacity: 0.7,
  },
}); 