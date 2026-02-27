import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Alert,
  Platform, TouchableWithoutFeedback, Keyboard, TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CustomerContext } from '../../context/CustomerContext';
import { carryForwardBilling } from '../../utils/billingUtils';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function MonthlyMilkLedgerScreen() {
  const { customers, updateCustomer } = useContext(CustomerContext);
  const [searchText, setSearchText] = useState('');
  const [focusedId, setFocusedId] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [milkPriceInputs, setMilkPriceInputs] = useState({});
  const { month, year } = getCurrentMonthYear();

  const filteredCustomers = customers.filter(c =>
    c.syncStatus !== 'deleted' &&
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    if (Object.keys(inputValues).length === 0) {
    const initial = {};
    customers.forEach(c => {
      const billingKey = `${year}-${month}`;
      const monthlyBilling = c.monthlyBilling || {};
      const currentBilling = monthlyBilling[billingKey] || {};
        
      initial[c.id] = {
          milkPrice: currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
            ? currentBilling.milkPrice.toString()
            : (c.milkPrice?.toString() || ''),
          pending: currentBilling.pending ? currentBilling.pending.toString() : '',
          advance: currentBilling.advance ? currentBilling.advance.toString() : '',
          paid: currentBilling.paidAmount ? currentBilling.paidAmount.toString() : '',
      };
    });
      setInputValues(initial);
    }
  }, [customers, month, year]);

  const handleInputChange = (cid, field, value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts[1] : numericValue;

    setInputValues(prev => ({
      ...prev,
      [cid]: { ...prev[cid], [field]: finalValue }
    }));
  };

  const handleInputBlur = async (cid, field) => {
    const c = customers.find(c => c.id === cid);
    if (!c) return;

    const value = inputValues[cid]?.[field];
    const num = value === '' ? 0 : parseFloat(value);
    const billingKey = `${year}-${month}`;
    const monthlyBilling = { ...c.monthlyBilling } || {};
    const currentBilling = monthlyBilling[billingKey] || {};

    // Prepare userBilling for carryForwardBilling
    const userBilling = {
      advance: field === 'advance' ? num : (currentBilling.advance || 0),
      pending: field === 'pending' ? num : (currentBilling.pending || 0),
      paidAmount: field === 'paid' ? num : (currentBilling.paidAmount || 0),
      entries: (c.entries || []).filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      }),
      milkPrice: field === 'milkPrice' ? num : (currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== '' ? currentBilling.milkPrice : c.milkPrice),
    };
    const newMonthlyBilling = carryForwardBilling(
      monthlyBilling,
      month,
      year,
      userBilling
    );
    try {
      const updatedCustomer = {
        ...c,
        monthlyBilling: newMonthlyBilling,
        ...(field === 'milkPrice' ? { milkPrice: num } : {}),
      };
      await updateCustomer(updatedCustomer);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const getTotals = useCallback((c) => {
    const monthEntries = (c.entries || []).filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const totalMilk = monthEntries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
    const billingKey = `${year}-${month}`;
    const monthlyBilling = c.monthlyBilling || {};
    const currentBilling = monthlyBilling[billingKey] || {};
    const price = currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
      ? parseFloat(currentBilling.milkPrice)
      : (c.milkPrice ? parseFloat(c.milkPrice) : 0);
    const amount = totalMilk * price;

    const paid = parseFloat(currentBilling.paidAmount) || 0;
    const advance = parseFloat(currentBilling.advance) || 0;
    const pending = parseFloat(currentBilling.pending) || 0;
    const due = amount - advance + pending - paid;

    return { totalMilk, amount, pending, advance, paid, due };
  }, [month, year]);

  const monthYearLabel = `${months[month - 1]} ${year}`;

  const handleMilkPriceChange = (cid, billingKey, value) => {
    setMilkPriceInputs(prev => ({
      ...prev,
      [cid]: { ...(prev[cid] || {}), [billingKey]: value }
    }));
    console.log('Input changed:', cid, billingKey, value);
  };

  const handleMilkPriceBlur = async (cid, billingKey) => {
    const c = customers.find(c => c.id === cid);
    if (!c) return;

    const value = milkPriceInputs[cid]?.[billingKey];
    const parsedPrice = parseFloat(value) || 0;

    const monthlyBilling = { ...c.monthlyBilling } || {};
    monthlyBilling[billingKey] = { ...(monthlyBilling[billingKey] || {}) };
    monthlyBilling[billingKey].milkPrice = parsedPrice;

    try {
      const updatedCustomer = {
        ...c,
        monthlyBilling // Do NOT update global milkPrice here
      };
      console.log('handleMilkPriceBlur:', { billingKey, cid, updatedCustomer, value });
      await updateCustomer(updatedCustomer);
    } catch (e) {
      Alert.alert('Error', 'Failed to update milk price.');
    }
  };

  useEffect(() => {
    const newInputs = {};
    customers.forEach(c => {
      const billingKey = `${year}-${month}`;
      const monthlyBilling = c.monthlyBilling || {};
      const currentBilling = monthlyBilling[billingKey] || {};

      newInputs[c.id] = {
        ...(milkPriceInputs[c.id] || {}),
        [billingKey]: (currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
          ? currentBilling.milkPrice.toString()
          : (c.milkPrice?.toString() || ''))
      };
    });
    setMilkPriceInputs(newInputs);
  }, [customers, month, year]);

  const saveAllChanges = async () => {
    try {
      for (const c of filteredCustomers) {
        const billingKey = `${year}-${month}`;
        const monthlyBilling = { ...c.monthlyBilling } || {};
        const currentBilling = monthlyBilling[billingKey] || {};
        const milkPriceRaw = milkPriceInputs[c.id]?.[billingKey];
        const milkPrice = milkPriceRaw !== undefined && milkPriceRaw !== null && milkPriceRaw !== '' ? parseFloat(milkPriceRaw) : (currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== '' ? currentBilling.milkPrice : c.milkPrice);
        console.log('Saving customer:', c.id, 'milkPriceRaw:', milkPriceRaw, 'parsed milkPrice:', milkPrice);
        const pending = inputValues[c.id]?.pending;
        const advance = inputValues[c.id]?.advance;
        const paid = inputValues[c.id]?.paid;
        const userBilling = {
          advance: advance === undefined ? (currentBilling.advance || 0) : parseFloat(advance) || 0,
          pending: pending === undefined ? (currentBilling.pending || 0) : parseFloat(pending) || 0,
          paidAmount: paid === undefined ? (currentBilling.paidAmount || 0) : parseFloat(paid) || 0,
          entries: (c.entries || []).filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
          }),
          milkPrice: milkPrice,
        };
        const newMonthlyBilling = carryForwardBilling(
          monthlyBilling,
          month,
          year,
          userBilling
        );
        await updateCustomer({
          ...c,
          monthlyBilling: newMonthlyBilling,
          milkPrice: milkPrice,
        });
      }
      Alert.alert('Success', 'All changes saved!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={Platform.OS === 'android' ? 20 : 0}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Monthly Milk Ledger</Text>
          <Text style={styles.date}>{monthYearLabel}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 10 }}>
            <TextInput
              style={[styles.searchInput, { flex: 1, maxWidth: 250 }]}
              placeholder="🔍 Search customer by name..."
              placeholderTextColor="#666"
              value={searchText}
              onChangeText={setSearchText}
              accessibilityLabel="Search customer by name"
            />
            <TouchableOpacity onPress={saveAllChanges} style={{ marginLeft: 10, backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <ScrollView style={styles.tableContainer}>
                <View style={styles.headerRow}>
                {['Customer Name', 'Milk Price', 'Total Milk', 'Amount', 'Pending', 'Advance', 'Paid', 'Due'].map(header => (
                  <View key={header} style={header === 'Customer Name' ? styles.nameHeader : styles.valueHeader}>
                    <Text style={styles.headerText}>{header}</Text>
                  </View>
                ))}
              </View>
              {filteredCustomers.length === 0 && (
                <View style={styles.noResultRow}>
                  <Text style={styles.noResultText}>No customers found.</Text>
                </View>
              )}
                {filteredCustomers.map((c, idx) => {
                  const totals = getTotals(c);
                const billingKey = `${year}-${month}`;
                const monthlyBilling = c.monthlyBilling || {};
                const currentBilling = monthlyBilling[billingKey] || {};

                  return (
                    <View key={c.id} style={[styles.row, idx % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                      <View style={styles.nameCell}><Text style={styles.nameText}>{c.name}</Text></View>
                    <View style={styles.valueCell}>
                      <TextInput
                        style={[styles.input, focusedId === `${c.id}-milkPrice` && styles.inputFocused]}
                        keyboardType="numeric"
                        placeholder="₹/L"
                        placeholderTextColor="#888"
                        value={milkPriceInputs[c.id]?.[billingKey] ?? ''}
                        onChangeText={txt => handleMilkPriceChange(c.id, billingKey, txt)}
                        onFocus={() => setFocusedId(`${c.id}-milkPrice`)}
                        returnKeyType="done"
                      />
                    </View>
                    <View style={styles.valueCell}><Text style={styles.valueText}>{totals.totalMilk.toFixed(2)}</Text></View>
                    <View style={styles.valueCell}><Text style={styles.valueText}>₹{totals.amount.toFixed(2)}</Text></View>
                    {['pending', 'advance', 'paid'].map(field => (
                      <View key={field} style={styles.valueCell}>
                      <TextInput
                          style={[styles.input, focusedId === `${c.id}-${field}` && styles.inputFocused]}
                        keyboardType="numeric"
                        placeholder="₹"
                        placeholderTextColor="#888"
                          value={inputValues[c.id]?.[field] ?? ''}
                          onChangeText={txt => handleInputChange(c.id, field, txt)}
                          onFocus={() => setFocusedId(`${c.id}-${field}`)}
                        returnKeyType="done"
                      />
                    </View>
                    ))}
                    <View style={styles.valueCell}>
                      <Text style={[styles.valueText, { color: totals.due > 0 ? '#d9534f' : '#5cb85c' }]}>
                        ₹{totals.due.toFixed(2)}
                      </Text>
                    </View>
                    </View>
                  );
                })}
            </ScrollView>
          </ScrollView>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 2 },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 1, color: '#1a1a1a', letterSpacing: 0.5 },
  date: { fontSize: 25, color: '#333', textAlign: 'center', marginBottom: 0, fontWeight: 'bold' },
  searchInput: {
    borderWidth: 2, borderColor: '#007AFF', borderRadius: 14, padding: 10,
    margin: 10, backgroundColor: '#f5faff', fontSize: 10, color: '#222',
    fontWeight: '500', letterSpacing: 0.2,
  },
  tableContainer: { marginHorizontal: 8, marginBottom: 150 },
  headerRow: { flexDirection: 'row', backgroundColor: '#003366', paddingVertical: 10, borderRadius: 8, marginBottom: 1 },
  headerText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#fff', letterSpacing: 0.5 },
  nameHeader: { width: 120, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 12 },
  valueHeader: { width: 90, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 2 },
  rowEven: { backgroundColor: '#f7f7fa' },
  rowOdd: { backgroundColor: '#eaf6ff' },
  nameCell: { width: 120, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 10 },
  valueCell: { width: 90, alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: '#222', textAlign: 'left', letterSpacing: 0.2 },
  input: {
    borderWidth: 2, borderColor: '#007bff', borderRadius: 10,
    padding: 10, fontSize: 16, backgroundColor: '#fff', marginBottom: 10, color: '#222',
  },
  inputFocused: { borderColor: '#007AFF', borderWidth: 2 },
  valueText: { fontSize: 16, color: '#222', fontWeight: 'bold', textAlign: 'center' },
  noResultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#f7f7fa' },
  noResultText: { fontSize: 16, color: '#222', fontWeight: 'bold', textAlign: 'center' },
});
