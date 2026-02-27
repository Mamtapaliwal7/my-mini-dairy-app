import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CustomerContext } from '../../context/CustomerContext';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function getTodayDisplay() {
  const now = new Date();
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function DailyCollectionScreen() {
  const { customers, updateCustomer } = useContext(CustomerContext);
  const [searchText, setSearchText] = useState('');
  const [focusedId, setFocusedId] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const todayISO = getTodayISO();
  const todayDisplay = getTodayDisplay();

  // Filter customers by search
  const filteredCustomers = customers.filter(c =>
    c.syncStatus !== 'deleted' && c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Initialize input values from context when customers change
  useEffect(() => {
    // Only set inputValues if it's empty (first load), to avoid erasing user input
    if (Object.keys(inputValues).length === 0) {
      const initial = {};
      customers.forEach(c => {
        const entry = (c.entries || []).find(e => e.date === todayISO);
        initial[c.id] = entry ? ((entry.morning || 0) + (entry.evening || 0)).toString() : '';
      });
      setInputValues(initial);
    }
  }, [customers, todayISO]);

  // Handle value change in local state
  const handleInputChange = (cid, value) => {
    setInputValues(prev => ({ ...prev, [cid]: value }));
  };

  // Save to context onBlur
  const handleInputBlur = (cid) => {
    const c = customers.find(c => c.id === cid);
    if (!c) return;
    const value = inputValues[cid];
    const num = parseFloat(value);
    let entries = [...(c.entries || [])];
    const idx = entries.findIndex(e => e.date === todayISO);
    if (!value || isNaN(num) || num <= 0) {
      // Remove entry if input is empty or invalid
      if (idx >= 0) {
        entries.splice(idx, 1);
        updateCustomer({ ...c, entries });
      }
      return;
    }
    // Save as morning, evening = 0
    const newEntry = { date: todayISO, morning: num, evening: 0 };
    if (idx >= 0) entries[idx] = newEntry;
    else entries.push(newEntry);
    updateCustomer({ ...c, entries });
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={Platform.OS === 'android' ? 20 : 0}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Dairy Milk Collection</Text>
        <Text style={styles.date}>{todayDisplay}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search customer by name..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
          accessibilityLabel="Search customer by name"
        />
        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <ScrollView style={styles.tableContainer}>
            <View style={styles.headerRow}>
              <View style={styles.nameHeader}><Text style={styles.headerText}>Customer Name</Text></View>
              <View style={styles.valueHeader}><Text style={styles.headerText}>Milk (Liters)</Text></View>
            </View>
            {filteredCustomers.length === 0 && (
              <View style={styles.noResultRow}>
                <Text style={styles.noResultText}>No customers found.</Text>
              </View>
            )}
            {filteredCustomers.map((c, idx) => (
              <View key={c.id} style={[styles.row, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}> 
                <View style={styles.nameCell}><Text style={styles.nameText}>{c.name}</Text></View>
                <View style={styles.valueCell}>
                  <TextInput
                    style={[
                      styles.input,
                      focusedId === c.id && styles.inputFocused
                    ]}
                    keyboardType="numeric"
                    placeholder="Enter total liters for today"
                    placeholderTextColor="#888"
                    value={inputValues[c.id] ?? ''}
                    onChangeText={txt => handleInputChange(c.id, txt)}
                    onFocus={() => setFocusedId(c.id)}
                    onBlur={() => {
                      setFocusedId(null);
                      handleInputBlur(c.id);
                    }}
                    accessibilityLabel={`Enter milk quantity for ${c.name}`}
                    accessible
                    returnKeyType="done"
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20, paddingHorizontal: 0 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#1a1a1a', letterSpacing: 0.5 },
  date: { fontSize: 25, color: '#333', textAlign: 'center', marginBottom: 0, fontWeight: 'bold' },
  searchInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 14,
    padding: 16,
    margin: 14,
    backgroundColor: '#f5faff',
    fontSize: 20,
    color: '#222',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tableContainer: { marginHorizontal: 6, marginBottom: 50 },
  headerRow: { flexDirection: 'row', backgroundColor: '#003366', paddingVertical: 12, borderRadius: 8, marginBottom: 4 },
  headerText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#fff', letterSpacing: 0.5 },
  nameHeader: { flex: 2, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 18 },
  valueHeader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 4 },
  rowEven: { backgroundColor: '#f7f7fa' },
  rowOdd: { backgroundColor: '#eaf6ff' },
  nameCell: { flex: 2, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 18 },
  valueCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'left', letterSpacing: 0.2 },
  input: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#222',
  },
  inputFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f0ff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  noResultRow: { padding: 30, alignItems: 'center' },
  noResultText: { fontSize: 22, color: '#888', fontWeight: 'bold' },
}); 