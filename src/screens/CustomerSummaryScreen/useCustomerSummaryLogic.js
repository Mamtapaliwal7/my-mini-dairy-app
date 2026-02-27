import { useState, useEffect, useContext } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { CustomerContext } from '../../context/CustomerContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function buildSummaryRow(c, selectedMonth, selectedYear, daysInMonth) {
  const billingKey = `${selectedYear}-${selectedMonth}`;
  const monthlyBilling = c.monthlyBilling || {};
  const currentBilling = monthlyBilling[billingKey] || {};
  const paidAmount = currentBilling.paidAmount !== undefined ? currentBilling.paidAmount : (c.paidAmount ? parseFloat(c.paidAmount) : 0);
  const advance = currentBilling.advance !== undefined ? currentBilling.advance : (c.advance ? parseFloat(c.advance) : 0);
  const pending = currentBilling.pending !== undefined ? currentBilling.pending : (c.pending ? parseFloat(c.pending) : 0);
  
  // Check if this month has carryforward from previous month
  const carriedFrom = currentBilling.carriedFrom || '';
  const carriedAmount = currentBilling.carriedAmount || 0;
  const carriedType = currentBilling.carriedType || '';
  
  const monthEntries = (c.entries || []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });
  const dateLiters = Array(daysInMonth).fill(0);
  monthEntries.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDate() - 1;
    dateLiters[day] += (e.morning || 0) + (e.evening || 0);
  });
  const totalLiters = dateLiters.reduce((a, b) => a + b, 0);
  const price = currentBilling.milkPrice !== undefined && currentBilling.milkPrice !== null && currentBilling.milkPrice !== ''
    ? parseFloat(currentBilling.milkPrice)
    : (c.milkPrice ? parseFloat(c.milkPrice) : 0);
  const totalAmount = totalLiters * price;
  const due = totalAmount - advance + pending - paidAmount;
  return {
    name: c.name,
    milkPrice: price,
    dateLiters,
    totalLiters,
    totalAmount,
    advance,
    pending,
    due,
    paidAmount,
    paymentStatus: due === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial Paid' : 'Not Paid'),
    carriedFrom,
    carriedAmount,
    carriedType,
    month: selectedMonth,
    year: selectedYear,
  };
}

export function useCustomerSummaryLogic() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearOptions, setYearOptions] = useState([new Date().getFullYear()]);
  const [searchText, setSearchText] = useState('');
  const [entryData, setEntryData] = useState({});
  const [dailyTotals, setDailyTotals] = useState([]);
  const [totalRow, setTotalRow] = useState({});
  const [loading, setLoading] = useState(false);

  const { customers, updateCustomer, syncStatus, companyName } = useContext(CustomerContext);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  useEffect(() => {
    // Find earliest year from all entries
    let minYear = selectedYear;
    customers.forEach(c =>
      (c.entries || []).forEach(e => {
        const y = new Date(e.date).getFullYear();
        if (y < minYear) minYear = y;
      })
    );
    const currentYear = new Date().getFullYear();
    const opts = [];
    for (let y = minYear; y <= currentYear; y++) {
      opts.push(y);
    }
    setYearOptions(opts);

    // Prepare entryData for daily cells
    const allData = {};
    customers.forEach(c => {
      const row = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const found = (c.entries || []).find(e => e.date === iso);
        row[iso] = found ? `${found.morning}/${found.evening}` : '';
      }
      allData[c.id] = row;
    });
    setEntryData(allData);

    // Calculate dailyTotals and totalRow for summary
    const filtered = customers.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));
    const totals = Array(daysInMonth).fill(0);
    let totalLiters = 0, totalAmount = 0, totalAdvance = 0, totalPending = 0, totalPaid = 0, totalDue = 0;
    filtered.forEach(c => {
      const summary = buildSummaryRow(c, selectedMonth, selectedYear, daysInMonth);
      summary.dateLiters.forEach((v, i) => { totals[i] += v; });
      totalLiters += summary.totalLiters;
      totalAmount += summary.totalAmount;
      totalAdvance += summary.advance;
      totalPending += summary.pending;
      totalPaid += summary.paidAmount;
      totalDue += summary.due;
    });
    setDailyTotals(totals);
    setTotalRow({
      totalLiters,
      totalAmount,
      totalAdvance,
      totalPending,
      totalPaid,
      totalDue
    });
  }, [customers, selectedMonth, selectedYear, searchText, daysInMonth]);

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));
  const summaryRows = filteredCustomers.map(c => buildSummaryRow(c, selectedMonth, selectedYear, daysInMonth));

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const { generateCustomerSummaryPDF } = await import('./Customerpdflogic');
      const html = generateCustomerSummaryPDF({
        summaryRows,
        dailyTotals,
        totalRow,
        selectedMonth,
        selectedYear,
        months: MONTHS,
        companyName: companyName || ''
      });
      const fileName = `Monthly Summary (${MONTHS[selectedMonth - 1]} ${selectedYear}).pdf`;
      const { uri } = await Print.printToFileAsync({ html });
      const newPath = uri.replace(/[^/]+$/, fileName);
      if (uri !== newPath) {
        const FileSystem = await import('expo-file-system');
        await FileSystem.moveAsync({ from: uri, to: newPath });
        await Sharing.shareAsync(newPath);
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert('Error', 'PDF export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (customer) => {
    try {
      setLoading(true);
      const { generateCustomerInvoicePDF } = await import('./Customerpdflogic');
      const summary = buildSummaryRow(customer, selectedMonth, selectedYear, daysInMonth);
      const html = generateCustomerInvoicePDF({
        summary,
        companyName: companyName || '',
        selectedMonth,
        selectedYear,
        months: MONTHS
      });
      const safeName = customer.name.replace(/[\\/:*?"<>|]/g, '');
      const fileName = `${safeName} - Invoice (${MONTHS[selectedMonth - 1]} ${selectedYear}).pdf`;
      const { uri } = await Print.printToFileAsync({ html });
      const newPath = uri.replace(/[^/]+$/, fileName);
      if (uri !== newPath) {
        const FileSystem = await import('expo-file-system');
        await FileSystem.moveAsync({ from: uri, to: newPath });
        await Sharing.shareAsync(newPath);
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Invoice download failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    customers,
    filteredCustomers,
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
    months: MONTHS,
    loading,
    summaryRows,
    syncStatus
  };
} 