import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Dimensions, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useCustomerSummaryLogic } from './useCustomerSummaryLogic';
import { MaterialIcons } from '@expo/vector-icons';
import ImageZoom from 'react-native-image-pan-zoom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CustomerSummaryScreen() {
  const {
    customers,
    filteredCustomers: allFilteredCustomers,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    yearOptions,
    searchText,
    setSearchText,
    daysInMonth,
    entryData,
    handleExportPDF,
    handleDownloadInvoice,
    dailyTotals,
    totalRow,
    months
  } = useCustomerSummaryLogic();

  const filteredCustomers = allFilteredCustomers.filter(c => c.syncStatus !== 'deleted');

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search customer..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#888"
      />
      <Text style={styles.title}>Customer Summary {months[selectedMonth - 1]} {selectedYear}</Text>
      <View style={styles.pickerRow}>
        <Picker style={[styles.picker, { height: 50, backgroundColor: '#fff', color: '#222', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }]}
        selectedValue={selectedMonth} onValueChange={setSelectedMonth}>
          {months.map((m, i) => (
            <Picker.Item key={i} label={m} value={i + 1} />
          ))}
        </Picker>
        <Picker style={[styles.picker, { height: 50, backgroundColor: '#fff', color: '#222', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }]}
        selectedValue={selectedYear} onValueChange={setSelectedYear}>
          {yearOptions.map(y => <Picker.Item key={y} label={`${y}`} value={y} />)}
        </Picker>
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
                <View style={styles.iconHeader}><Text style={styles.headerText}>PDF</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Price</Text></View>
                {[...Array(daysInMonth)].map((_, i) => (
                  <View key={i} style={styles.cellHeader}><Text style={styles.headerText}>{i + 1}</Text></View>
                ))}
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Total L</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Amt ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Pend ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Adv ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Paid ₹</Text></View>
                <View style={styles.summaryHeader}><Text style={styles.headerText}>Due ₹</Text></View>
              </View>
              {/* CUSTOMER ROWS */}
              {filteredCustomers.map(c => {
                const billingKey = `${selectedYear}-${selectedMonth}`;
                const monthlyBilling = c.monthlyBilling || {};
                const currentBilling = monthlyBilling[billingKey] || {};
                const paidAmount = currentBilling.paidAmount !== undefined ? currentBilling.paidAmount : (c.paidAmount ? parseFloat(c.paidAmount) : 0);
                const advance = currentBilling.advance !== undefined ? currentBilling.advance : (c.advance ? parseFloat(c.advance) : 0);
                const pending = currentBilling.pending !== undefined ? currentBilling.pending : (c.pending ? parseFloat(c.pending) : 0);
                
                // Check for carryforward
                const carriedFrom = currentBilling.carriedFrom || '';
                const carriedAmount = currentBilling.carriedAmount || 0;
                const carriedType = currentBilling.carriedType || '';
                
                const monthEntries = (c.entries || []).filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                });
                const totalMilk = monthEntries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
                const price = currentBilling.milkPrice !== undefined ? parseFloat(currentBilling.milkPrice) : 0;
                console.log('CustomerSummaryScreen:', { customerId: c.id, billingKey, price, currentBilling });
                const amount = totalMilk * price;
                const due = amount - advance + pending - paidAmount;
                return (
                  <View key={c.id} style={styles.row}>
                    <View style={styles.nameCell}>
                      <Text style={styles.nameText}>{c.name}</Text>
                      {carriedFrom && (
                        <Text style={styles.carryforwardText}>
                          {carriedType === 'advance' ? '💰' : '📄'} Carried: ₹{carriedAmount.toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.iconCell}>
                      <TouchableOpacity onPress={() => handleDownloadInvoice(c)}>
                        <MaterialIcons name="picture-as-pdf" size={24} color="#d9534f" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{price.toFixed(2)}</Text></View>
                    {[...Array(daysInMonth)].map((_, i) => {
                      const iso = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
                      return (
                        <View key={i} style={styles.cell}>
                          <Text style={styles.input}>{entryData[c.id]?.[iso] || ''}</Text>
                        </View>
                      );
                    })}
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>{totalMilk.toFixed(2)}</Text></View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{amount.toFixed(2)}</Text></View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{pending.toFixed(2)}</Text></View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{advance.toFixed(2)}</Text></View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{paidAmount.toFixed(2)}</Text></View>
                    <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{due.toFixed(2)}</Text></View>
                    <View style={styles.nameCell}><Text style={styles.nameText}>{c.name}</Text></View>
                  </View>
                );
              })}
              {/* TOTAL SUMMARY ROW */}
              <View style={[styles.row, { backgroundColor: '#e0ffe0' }]}> 
                <View style={styles.nameCell}><Text style={styles.nameText}>TOTAL</Text></View>
                <View style={styles.iconCell} />
                <View style={styles.summaryCell}><Text style={styles.summaryText}>-</Text></View>
                {[...Array(daysInMonth)].map((_, i) => (
                  <View key={i} style={styles.cell}><Text style={styles.summaryText}>{(dailyTotals[i] || 0).toFixed(1)}</Text></View>
                ))}
                <View style={styles.summaryCell}><Text style={styles.summaryText}>{(totalRow.totalLiters || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{(totalRow.totalAmount || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{(totalRow.totalPending || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{(totalRow.totalAdvance || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{(totalRow.totalPaid || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryCell}><Text style={styles.summaryText}>₹{(totalRow.totalDue || 0).toFixed(2)}</Text></View>
                <View style={styles.nameCell}><Text style={styles.nameText}>TOTAL</Text></View>
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </KeyboardAwareScrollView>

      <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
        <Text style={styles.exportText}>📤 Export Monthly PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 0,marginBottom: 0 },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center',marginBottom: 0 , marginVertical: 0 },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 0 },
  picker: { flex: 1 },
  searchInput: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#222',
  },
  scrollContainer: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  nameHeader: { width: 80, backgroundColor: '#d0e7ff', justifyContent: 'center', alignItems: 'center', padding: 5 },
  iconHeader: { width: 40, backgroundColor: '#ffeccc', justifyContent: 'center', alignItems: 'center', padding: 5 },
  nameCell: { width: 80, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', padding: 5 },
  iconCell: { width: 40, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center', padding: 5 },
  headerText: { fontSize: 15, fontWeight: 'bold' },
  nameText: { fontSize: 15, textAlign: 'center' },
  carryforwardText: { fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 },
  cellHeader: { width: 50, backgroundColor: '#d0e7ff', padding: 3, justifyContent: 'center', alignItems: 'center' },
  cell: { width: 50, padding: 2, borderWidth: 0.2, borderColor: '#ccc' },
  input: { fontSize: 15, textAlign: 'center', padding: 2 },
  summaryHeader: { width: 80, backgroundColor: '#ffeccc', justifyContent: 'center', alignItems: 'center', padding: 3 },
  summaryCell: { width: 80, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center', padding: 3 },
  summaryText: { fontSize: 15, fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#007bff', padding: 10, margin: 20, borderRadius: 110, alignItems: 'center' },
  exportText: { fontSize: 25, color: 'white', fontWeight: 'bold' },
  tableContainer: { flex: 1 },
  tableContent: { padding: 10 },
}); 