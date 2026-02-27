// RegisterScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Dimensions, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CustomerContext } from '../context/CustomerContext';
import { carryForwardBilling } from '../utils/billingUtils';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getLocalDateString = (year, month, day) => {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export default function RegisterScreen() {
  const { customers, updateCustomer } = useContext(CustomerContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entryData, setEntryData] = useState({});
  const [yearOptions, setYearOptions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [milkPriceInputs, setMilkPriceInputs] = useState({});
  const [focusedId, setFocusedId] = useState(null);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  useEffect(() => {
    let minYear = selectedYear;
    customers.forEach(c =>
      (c.entries || []).forEach(e => {
        const y = new Date(e.date).getFullYear();
        if (y < minYear) minYear = y;
      })
    );

    const opts = [];
    for (let y = minYear; y <= selectedYear; y++) {
      opts.push(y);
    }
    setYearOptions(opts);

    const allData = {};
    customers.forEach(c => {
      const row = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = getLocalDateString(selectedYear, selectedMonth, d);
        const found = (c.entries || []).find(e => e.date === iso);
        row[iso] = found ? `${found.morning}/${found.evening}` : '';
      }
      allData[c.id] = row;
    });
    setEntryData(allData);
  }, [customers, selectedMonth, selectedYear]);

  // Trigger carryforward calculation when month/year changes
  useEffect(() => {
    customers.forEach(c => {
      const billingKey = `${selectedYear}-${selectedMonth}`;
      const monthlyBilling = c.monthlyBilling || {};
      const currentBilling = monthlyBilling[billingKey] || {};
      
      // Only trigger if there's existing billing data for this month
      if (currentBilling.advance !== undefined || currentBilling.pending !== undefined || currentBilling.paidAmount !== undefined) {
        const monthEntries = (c.entries || []).filter(e => {
          const d = new Date(e.date);
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        });
        
        const monthMilkPrice = monthlyBilling[billingKey]?.milkPrice !== undefined && monthlyBilling[billingKey]?.milkPrice !== null && monthlyBilling[billingKey]?.milkPrice !== ''
          ? monthlyBilling[billingKey].milkPrice
          : c.milkPrice;
        
        const userBilling = {
          advance: currentBilling.advance || 0,
          pending: currentBilling.pending || 0,
          paidAmount: currentBilling.paidAmount || 0,
          entries: monthEntries,
          milkPrice: monthMilkPrice,
        };
        
        const newMonthlyBilling = carryForwardBilling(
          monthlyBilling,
          selectedMonth,
          selectedYear,
          userBilling
        );
        
        // Only update if there are changes
        if (JSON.stringify(monthlyBilling) !== JSON.stringify(newMonthlyBilling)) {
          updateCustomer({ ...c, monthlyBilling: newMonthlyBilling });
        }
      }
    });
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    setMilkPriceInputs(prev => {
      const newInputs = { ...prev };
      customers.forEach(c => {
        const billingKey = `${selectedYear}-${selectedMonth}`;
        const monthlyBilling = c.monthlyBilling || {};
        const currentBilling = monthlyBilling[billingKey] || {};
        if (!newInputs[c.id]) newInputs[c.id] = { ...prev[c.id] };
        if (newInputs[c.id][billingKey] === undefined) {
          newInputs[c.id][billingKey] = (currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
            ? currentBilling.milkPrice.toString()
            : (c.milkPrice?.toString() || ''));
        }
      });
      return newInputs;
    });
  }, [customers, selectedMonth, selectedYear]);

  const handleEntryChange = (cid, date, text) => {
    // Parse morning/evening format
    const [mStr, eStr] = text.split('/');
    const morning = parseFloat(mStr) || 0;
    const evening = parseFloat(eStr) || 0;
    setEntryData(prev => ({
      ...prev,
      [cid]: { ...prev[cid], [date]: text }
    }));
    const c = customers.find(c => c.id === cid);
    if (!c) return;
    const updated = [...(c.entries || [])];
    const idx = updated.findIndex(x => x.date === date);
    if (morning || evening) {
      const newEntry = { date, morning, evening };
      if (idx >= 0) updated[idx] = newEntry;
      else updated.push(newEntry);
    } else if (idx >= 0) {
      updated.splice(idx, 1);
    }
    // Now recalculate billing for this customer
    const billingKey = `${selectedYear}-${selectedMonth}`;
    const monthlyBilling = { ...c.monthlyBilling };
    const monthMilkPrice = monthlyBilling[billingKey]?.milkPrice !== undefined && monthlyBilling[billingKey]?.milkPrice !== null && monthlyBilling[billingKey]?.milkPrice !== ''
      ? monthlyBilling[billingKey].milkPrice
      : c.milkPrice;
    const userBilling = {
      advance: monthlyBilling[billingKey]?.advance || 0,
      pending: monthlyBilling[billingKey]?.pending || 0,
      paidAmount: monthlyBilling[billingKey]?.paidAmount || 0,
      entries: updated.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      }),
      milkPrice: monthMilkPrice,
    };
    const newMonthlyBilling = carryForwardBilling(
      monthlyBilling,
      selectedMonth,
      selectedYear,
      userBilling
    );
    updateCustomer({ ...c, entries: updated, monthlyBilling: newMonthlyBilling });
  };

  const handleCustomerFieldChange = (cid, field, value) => {
    const c = customers.find(c => c.id === cid);
    if (!c) return;
      const billingKey = `${selectedYear}-${selectedMonth}`;
      const monthlyBilling = { ...c.monthlyBilling };
    if (!monthlyBilling[billingKey]) monthlyBilling[billingKey] = {};
    if (field === 'milkPrice') {
      monthlyBilling[billingKey].milkPrice = parseFloat(value) || 0;
      updateCustomer({ ...c, monthlyBilling });
      return;
    }
    const monthMilkPrice = monthlyBilling[billingKey]?.milkPrice !== undefined && monthlyBilling[billingKey]?.milkPrice !== null && monthlyBilling[billingKey]?.milkPrice !== ''
      ? monthlyBilling[billingKey].milkPrice
      : c.milkPrice;
    const userBilling = {
      advance: field === 'advance' ? parseFloat(value) || 0 : (monthlyBilling[billingKey]?.advance || 0),
      pending: field === 'pending' ? parseFloat(value) || 0 : (monthlyBilling[billingKey]?.pending || 0),
      paidAmount: field === 'paidAmount' ? parseFloat(value) || 0 : (monthlyBilling[billingKey]?.paidAmount || 0),
      entries: (c.entries || []).filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      }),
      milkPrice: monthMilkPrice,
      };
    const newMonthlyBilling = carryForwardBilling(
      monthlyBilling,
      selectedMonth,
      selectedYear,
      userBilling
    );
    updateCustomer({ ...c, monthlyBilling: newMonthlyBilling });
  };

  const handleMilkPriceChange = (cid, billingKey, value) => {
    setMilkPriceInputs(prev => ({
      ...prev,
      [cid]: { ...(prev[cid] || {}), [billingKey]: value }
    }));
  };

  const handleMilkPriceBlur = (cid, billingKey) => {
    const c = customers.find(c => c.id === cid);
    if (!c) return;
    const value = milkPriceInputs[c.id]?.[billingKey];
    const parsedPrice = parseFloat(value) || 0;
    const monthlyBilling = { ...c.monthlyBilling } || {};
    monthlyBilling[billingKey] = { ...(monthlyBilling[billingKey] || {}) };
    monthlyBilling[billingKey].milkPrice = parsedPrice;
    const updatedCustomer = { ...c, monthlyBilling };
    console.log('handleMilkPriceBlur:', { cid, billingKey, value, updatedCustomer });
    updateCustomer(updatedCustomer);
  };

  const saveEntries = () => {
    // No need to save entries again since we're updating them in real-time
    Alert.alert('✅ Saved', 'Entries are automatically saved as you type.');
  };

  const filteredCustomers = customers.filter(c => c.syncStatus !== 'deleted' && c.name.toLowerCase().includes(searchText.toLowerCase()));

  const calculateMonthlyDue = (entries, price, advance, pending, paidAmount) => {
    const totalMilk = entries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
    const amount = totalMilk * price;
    return amount - advance + pending - paidAmount;
  };

  const getNextMonthYear = (month, year) => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return { nextMonth, nextYear };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔎 Search customer....."
          value={searchText}
          onChangeText={setSearchText}
        />
        <Text style={styles.title}> Register Milk Entries  {months[selectedMonth - 1]} {selectedYear}</Text>

        <View style={styles.pickerRow}>
          <Picker
             style={[styles.picker, { height: 50, backgroundColor: '#fff', color: '#222', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }]}
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            {months.map((m, i) => (
              <Picker.Item key={i} label={m} value={i + 1} />
            ))}
          </Picker>
          <Picker
             style={[styles.picker, { height: 50, backgroundColor: '#fff', color: '#222', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }]}
            selectedValue={selectedYear}
            onValueChange={setSelectedYear}
          >
            {yearOptions.map(y => (
              <Picker.Item key={y} label={`${y}`} value={y} />
            ))}
          </Picker>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.tableContainer}
        contentContainerStyle={styles.tableContent}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={Platform.OS === 'android' ? 50 : 30}
        keyboardOpeningTime={0}
      >
        <ScrollView horizontal>
          <ScrollView style={styles.scrollContainer}>
            <View>
              {/* HEADER */}
              <View style={styles.row}>
                <View style={styles.nameHeader}><Text style={styles.headerText}>Name</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>₹/L</Text></View>
                {[...Array(daysInMonth)].map((_, i) => (
                  <View key={i} style={styles.cellHeader}>
                    <Text style={styles.headerText}>{i + 1}</Text>
                  </View>
                ))}
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Total L</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Amt ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Pend ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Adv ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Paid ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Due ₹</Text></View>
                <View style={styles.nameHeader}><Text style={styles.headerText}>Name</Text></View>
              </View>

              {/* CUSTOMER ROWS */}
              {filteredCustomers.map(c => {
                const billingKey = `${selectedYear}-${selectedMonth}`;
                const monthlyBilling = c.monthlyBilling || {};
                const currentBilling = monthlyBilling[billingKey] || {};
                const paidAmount = currentBilling.paidAmount !== undefined ? currentBilling.paidAmount : (c.paidAmount ? parseFloat(c.paidAmount) : 0);
                const advance = currentBilling.advance !== undefined ? currentBilling.advance : (c.advance ? parseFloat(c.advance) : 0);
                const pending = currentBilling.pending !== undefined ? currentBilling.pending : (c.pending ? parseFloat(c.pending) : 0);
                const monthEntries = (c.entries || []).filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                });
                const price = currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
                  ? parseFloat(currentBilling.milkPrice)
                  : (c.milkPrice ? parseFloat(c.milkPrice) : 0);
                const totalMilk = monthEntries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
                const amount = totalMilk * price;
                const due = calculateMonthlyDue(monthEntries, price, advance, pending, paidAmount);

                return (
                  <View key={c.id} style={styles.row}>
                    <View style={styles.nameCell}>
                      <Text style={styles.nameText}>{c.name}</Text>
                    </View>

                    {/* Milk Price */}
                    <View style={styles.summaryCell}>
                      <TextInput
                        style={[styles.input, focusedId === `${c.id}-milkPrice` && styles.inputFocused]}
                        keyboardType="numeric"
                        placeholder="₹/L"
                        placeholderTextColor="#888"
                        value={milkPriceInputs[c.id]?.[billingKey] ?? ''}
                        onChangeText={txt => handleMilkPriceChange(c.id, billingKey, txt)}
                        onFocus={() => setFocusedId(`${c.id}-milkPrice`)}
                        onBlur={() => {
                          setFocusedId(null);
                          handleMilkPriceBlur(c.id, billingKey);
                        }}
                        returnKeyType="done"
                      />
                    </View>

                    {[...Array(daysInMonth)].map((_, i) => {
                      const iso = getLocalDateString(selectedYear, selectedMonth, i + 1);
                      return (
                        <View key={i} style={styles.cell}>
                          <TextInput
                            style={styles.input}
                            placeholder="M/E"
                            value={entryData[c.id]?.[iso] || ''}
                            onChangeText={txt => handleEntryChange(c.id, iso, txt)}
                            returnKeyType="done"
                            placeholderTextColor="#888"
                          />
                        </View>
                      );
                    })}

                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryText}>{totalMilk.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryText}>₹{amount.toFixed(2)}</Text>
                    </View>

                    {/* Pending */}
                    <View style={styles.summaryCell}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="₹"
                        value={pending.toString()}
                        onChangeText={txt => handleCustomerFieldChange(c.id, 'pending', txt)}
                        returnKeyType="done"
                        placeholderTextColor="#888"
                      />
                    </View>

                    {/* Advance */}
                    <View style={styles.summaryCell}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="₹"
                        value={advance.toString()}
                        onChangeText={txt => handleCustomerFieldChange(c.id, 'advance', txt)}
                        returnKeyType="done"
                        placeholderTextColor="#888"
                      />
                    </View>

                    {/* Paid */}
                    <View style={styles.summaryCell}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="₹"
                        value={paidAmount.toString()}
                        onChangeText={txt => handleCustomerFieldChange(c.id, 'paidAmount', txt)}
                        returnKeyType="done"
                        placeholderTextColor="#888"
                      />
                    </View>

                    {/* Due */}
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryText}>₹{due.toFixed(2)}</Text>
                    </View>
                    <View style={styles.nameCell}>
                      <Text style={styles.nameText}>{c.name}</Text>
                    </View>
                  </View>
                );
              })}

              {/* TOTAL ROW */}
              <View style={[styles.row, { backgroundColor: '#e0ffe0' }]}>
                <View style={styles.nameCell}><Text style={styles.nameText}>TOTAL</Text></View>
                <View style={styles.summaryCell} />
                {[...Array(daysInMonth)].map((_, i) => {
                  const iso = getLocalDateString(selectedYear, selectedMonth, i + 1);
                  const totalForDay = customers.reduce((sum, c) => {
                    const entry = (c.entries || []).find(e => e.date === iso);
                    const m = entry?.morning || 0;
                    const e = entry?.evening || 0;
                    return sum + m + e;
                  }, 0);
                  return (
                    <View key={i} style={styles.cell}>
                      <Text style={styles.summaryText}>{totalForDay.toFixed(1)}</Text>
                    </View>
                  );
                })}
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    {customers.reduce((t, c) => {
                      const ml = (c.entries || [])
                        .filter(e => {
                          const d = new Date(e.date);
                          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                        })
                        .reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
                      return t + ml;
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    ₹{customers.reduce((sum, c) => {
                      const ml = (c.entries || [])
                        .filter(e => {
                          const d = new Date(e.date);
                          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                        })
                        .reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
                      return sum + ml * (parseFloat(c.milkPrice) || 0);
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    ₹{customers.reduce((sum, c) => {
                      const billingKey = `${selectedYear}-${selectedMonth}`;
                      const monthlyBilling = c.monthlyBilling || {};
                      const currentBilling = monthlyBilling[billingKey] || {};
                      return sum + (currentBilling.pending !== undefined ? currentBilling.pending : (parseFloat(c.pending) || 0));
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    ₹{customers.reduce((sum, c) => {
                      const billingKey = `${selectedYear}-${selectedMonth}`;
                      const monthlyBilling = c.monthlyBilling || {};
                      const currentBilling = monthlyBilling[billingKey] || {};
                      return sum + (currentBilling.advance !== undefined ? currentBilling.advance : (parseFloat(c.advance) || 0));
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    ₹{customers.reduce((sum, c) => {
                      const billingKey = `${selectedYear}-${selectedMonth}`;
                      const monthlyBilling = c.monthlyBilling || {};
                      const currentBilling = monthlyBilling[billingKey] || {};
                      return sum + (currentBilling.paidAmount !== undefined ? currentBilling.paidAmount : (parseFloat(c.paidAmount) || 0));
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryText}>
                    ₹{customers.reduce((sum, c) => {
                      const billingKey = `${selectedYear}-${selectedMonth}`;
                      const monthlyBilling = c.monthlyBilling || {};
                      const currentBilling = monthlyBilling[billingKey] || {};
                      const paidAmount = currentBilling.paidAmount !== undefined ? currentBilling.paidAmount : 0;
                      const advance = currentBilling.advance !== undefined ? currentBilling.advance : 0;
                      const pending = currentBilling.pending !== undefined ? currentBilling.pending : 0;
                      
                      const monthEntries = (c.entries || [])
                        .filter(e => {
                          const d = new Date(e.date);
                          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                        });
                      const totalMilk = monthEntries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
                      const price = currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
                        ? parseFloat(currentBilling.milkPrice)
                        : (c.milkPrice ? parseFloat(c.milkPrice) : 0);
                      const amount = totalMilk * price;
                      return sum + (amount - advance + pending - paidAmount);
                    }, 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.nameCell}><Text style={styles.nameText}>TOTAL</Text></View>
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </KeyboardAwareScrollView>

      <TouchableOpacity style={styles.saveBtn} onPress={saveEntries}>
        <Text style={styles.saveText}>💾 Save Entries</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    paddingTop: 0 
  },
  headerContainer: {
    paddingHorizontal: 10,
    paddingTop: 5,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 8,
    marginBottom: 5,
    backgroundColor: '#f9f9f9',
  },
  title: { 
    fontSize: 30, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 1 
  },
  pickerRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 5 
  },
  picker: { 
    flex: 1 
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tableContent: {
    paddingBottom: 30, // Reduced padding
  },
  scrollContainer: { 
    marginBottom: 5 
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  nameHeader: { 
    width: 80, 
    backgroundColor: '#d0e7ff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 5 
  },
  nameCell: { 
    width: 80, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 5 
  },
  headerText: { 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
  nameText: { 
    fontSize: 15, 
    textAlign: 'center' 
  },
  cellHeader: { 
    width: 50, 
    backgroundColor: '#d0e7ff', 
    padding: 3, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cell: { 
    width: 50, 
    padding: 2, 
    borderWidth: 0.2, 
    borderColor: '#ccc' 
  },
  input: {
    fontSize: 15,
    textAlign: 'center',
    padding: 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 4,
    minHeight: 30,
    width: '100%',
    color: '#222',
  },
  inputFocused: {
    borderColor: '#007bff',
  },
  summaryHeader: { 
    width: 80, 
    backgroundColor: '#ffeccc', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 3 
  },
  summaryCell: { 
    width: 80, 
    backgroundColor: '#fafafa', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 3 
  },
  summaryText: { 
    fontSize: 15, 
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%'
  },
  saveBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 112,                 
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,                    
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  }
});
