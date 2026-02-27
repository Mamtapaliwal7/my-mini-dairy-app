import { dbService } from './firebaseCentral';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Test the new subcollection structure
 */
export const testNewStructure = {
  /**
   * Test adding a customer and entries with the new structure
   */
  testCustomerAndEntries: async (userId) => {
    try {
      console.log('🧪 Testing new subcollection structure...');
      
      // 1. Add a test customer
      const testCustomer = {
        name: 'Test Customer',
        phone: '1234567890',
        milkPrice: 50,
        address: 'Test Address'
      };
      
      const newCustomer = await dbService.customers.add(userId, testCustomer);
      console.log('✅ Customer added:', newCustomer.id);
      
      // 2. Add some test entries
      const testEntries = [
        { date: '2025-01-01', morning: 5.5, evening: 4.2 },
        { date: '2025-01-02', morning: 6.0, evening: 3.8 },
        { date: '2025-02-01', morning: 5.8, evening: 4.5 },
        { date: '2025-02-02', morning: 6.2, evening: 4.0 }
      ];
      
      await dbService.entries.batchAddOrUpdate(userId, newCustomer.id, testEntries);
      console.log('✅ Entries added');
      
      // 3. Get customer without entries
      const customerWithoutEntries = await dbService.customers.getById(userId, newCustomer.id);
      console.log('✅ Customer retrieved (no entries):', customerWithoutEntries.name);
      
      // 4. Get entries for specific month
      const januaryEntries = await dbService.entries.getByMonth(userId, newCustomer.id, 2025, 1);
      console.log('✅ January entries:', januaryEntries.length);
      
      // 5. Get all entries
      const allEntries = await dbService.entries.getAllForCustomer(userId, newCustomer.id);
      console.log('✅ All entries:', allEntries.length);
      
      return {
        success: true,
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        totalEntries: allEntries.length,
        januaryEntries: januaryEntries.length
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Clean up test data
   */
  cleanupTestData: async (userId, customerId) => {
    try {
      await dbService.customers.delete(userId, customerId);
      console.log('✅ Test data cleaned up');
      return { success: true };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}; 