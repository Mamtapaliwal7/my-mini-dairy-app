import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CustomerContext } from '../context/CustomerContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { syncAll, syncStatus, customers, companyName } = useContext(CustomerContext);
  const [search, setSearch] = useState('');
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const filteredCustomers = customers.filter((c) =>
    c.syncStatus !== 'deleted' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
   
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled">
             {/* ☰ Menu icon */}
        <TouchableOpacity style={styles.profileIcon}
          onPress={() => navigation.navigate('Menu')}>
          <Ionicons name="menu" size={32} color="#1f6f8b" />
        </TouchableOpacity>

        <Text style={styles.title}> {companyName || 'MilkApp'} Customers List</Text>

        <TextInput
          placeholder="Search customer..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <TouchableOpacity
  style={styles.syncButton}
  onPress={async () => {
    if (loading) return; 
    setLoading(true);
    try {
    if (user?.uid) {
        const success = await syncAll(user.uid);
      if (success) {
        alert('✅ Synced successfully!');
      } else {
        alert('❌ Failed to sync. Try again.');
      }
    } else {
      alert('⚠️ You must be logged in to sync.');
      }
    } catch (error) {
      alert('❌ An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }}
  disabled={loading}
>
<Text style={styles.syncButtonText}>
  {loading ? 'Syncing...' : '🔄 Sync to Cloud'}
</Text>
</TouchableOpacity>

        {filteredCustomers.map((item) => (
          <View key={item.id} style={styles.customerCard}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CustomerProfile', { customer: item })
              }
            >
              <Text style={styles.customerName}>{item.name}</Text>
            </TouchableOpacity>

            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.entryButton}
                onPress={() =>
                  navigation.navigate('AddEntry', { customer: item })
                }
              >
                <Text style={styles.entryButtonText}>➕ Milk Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>
                  navigation.navigate('CustomerProfile', { customer: item })
                }
              >
                <Text style={styles.viewButtonText}>📖 View</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCustomer')}
        >
          <Text style={styles.addButtonText}>➕ Add Customer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
   profileIcon: {
    position: 'absolute',
    top: 0.1,
    right: 0,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f6f8b',
    marginBottom: 1,
    marginTop: 0,
  },
  searchInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 110,
    marginBottom: 2,
    backgroundColor: '#fff',
  },
  customerCard: {
    padding: 5,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customerName: {
    fontSize: 25,
    marginBottom: 0,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryButton: {
    backgroundColor: '#4caf50',
    padding: 7,
    borderRadius: 8,
  },
  entryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  viewButton: {
    backgroundColor: '#2196f3',
    padding: 7,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#1f6f8b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: 'bold',
  },
  syncButton: {
    backgroundColor: '#f0ad4e',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginVertical: 10,
    marginLeft: 5,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  
});
