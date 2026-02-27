import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase.client';
import { collection, doc, getDocs, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { dbService } from './firebaseCentral';

const CUSTOMER_KEY = 'customers';

// Recursively delete all entries subcollections for a customer
export async function deleteCustomerEntries(userId, customerId) {
  const monthsRef = collection(db, 'users', userId, 'customers', customerId, 'entries');
  const monthsSnapshot = await getDocs(monthsRef);

  for (const monthDoc of monthsSnapshot.docs) {
    const entriesRef = collection(monthDoc.ref, 'entries');
    const entriesSnapshot = await getDocs(entriesRef);

    // Delete all entry documents in this month
    for (const entryDoc of entriesSnapshot.docs) {
      await deleteDoc(entryDoc.ref);
    }
    // Delete the month document itself (optional, but keeps things clean)
    await deleteDoc(monthDoc.ref);
  }
}

/**
 * Syncs local customers with Firebase using the NEW subcollection structure.
 * - Separates customer data from entries
 * - Stores entries in subcollections: users/{userId}/customers/{customerId}/entries/{YYYY-MM}/entries/{entryId}
 * - Handles 'deleted' customers and entries
 * - Uses batching for efficient writes/deletes
 * @param {string} userId - The current user's UID
 * @returns {Promise<{writes: number, deletes: number, unchanged: number, total: number, success: boolean}>}
 */
export async function syncCustomersWithFirebase(userId) {
  if (!userId) {
    return { writes: 0, deletes: 0, unchanged: 0, total: 0, success: false };
  }
  try {
    // 1. Get local customers
    const raw = await AsyncStorage.getItem(CUSTOMER_KEY);
    let localArr = JSON.parse(raw || '[]');
    const local = {};
    for (const c of localArr) if (c.id) local[c.id] = c;

    // 2. Get Firebase customers (without entries)
    const customersRef = collection(db, 'users', userId, 'customers');
    const snapshot = await getDocs(customersRef);
    const remote = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Remove entries from remote data since they're stored in subcollections
      const { entries, ...customerData } = data;
      remote[docSnap.id] = customerData;
    });

    // 3. Prepare batch
    const batch = writeBatch(db);
    let writes = 0, deletes = 0, unchanged = 0;
    const deletedIds = [];

    // (a) Handle 'deleted' customers: delete from Firebase
    for (const id in local) {
      if (local[id].syncStatus === 'deleted') {
        // Recursively delete all entries subcollections before deleting the customer
        await deleteCustomerEntries(userId, id);
        batch.delete(doc(customersRef, id));
        deletes++;
        deletedIds.push(id);
      }
    }

    // (b) Upload new/changed customers (skip deleted)
    for (const id in local) {
      if (local[id].syncStatus === 'deleted') continue;
      
      const localData = { ...local[id] };
      const entries = localData.entries || [];
      delete localData.syncStatus;
      delete localData.entries; // Remove entries from customer document
      
      if (!remote[id] || JSON.stringify(localData) !== JSON.stringify(remote[id])) {
        batch.set(doc(customersRef, id), localData, { merge: true });
        writes++;
      } else {
        unchanged++;
      }

      // Sync entries to subcollections
      if (entries.length > 0) {
        try {
          await dbService.entries.batchAddOrUpdate(userId, id, entries);
        } catch (error) {
          console.error(`Failed to sync entries for customer ${id}:`, error);
        }
      }
    }

    // (c) Delete customers missing locally (not present at all)
    for (const id in remote) {
      if (!local[id]) {
        batch.delete(doc(customersRef, id));
        deletes++;
      }
    }

    // 4. Commit if needed
    if (writes === 0 && deletes === 0) {
      return { writes, deletes, unchanged, total: Object.keys(local).length, success: true };
    }
    await batch.commit();

    // 5. Remove deleted customers from local storage
    if (deletedIds.length > 0) {
      localArr = localArr.filter(c => !deletedIds.includes(c.id));
      await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(localArr));
    }

    return { writes, deletes, unchanged, total: Object.keys(local).length, success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { writes: 0, deletes: 0, unchanged: 0, total: 0, success: false };
  }
}

/**
 * Downloads customers from Firebase and merges with local data
 * @param {string} userId - The current user's UID
 * @returns {Promise<{count: number, success: boolean}>}
 */
export async function downloadCustomersFromFirebase(userId) {
  if (!userId) {
    return { count: 0, success: false };
  }
  try {
    // Get customers from Firebase
    const firebaseCustomers = await dbService.customers.getAll(userId);
    
    // For each customer, get their entries from subcollections
    const customersWithEntries = [];
    
    for (const customer of firebaseCustomers) {
      try {
        const entries = await dbService.entries.getAllForCustomer(userId, customer.id);
        
        // Create customer in local format (with entries array)
        const customerWithEntries = {
          ...customer,
          entries: entries,
          syncStatus: 'synced'
        };
        
        customersWithEntries.push(customerWithEntries);
      } catch (error) {
        console.error(`Failed to get entries for customer ${customer.id}:`, error);
        // Add customer without entries
        customersWithEntries.push({
          ...customer,
          entries: [],
          syncStatus: 'synced'
        });
      }
    }
    
    // Save to local storage
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customersWithEntries));
    
    return { count: customersWithEntries.length, success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { count: 0, success: false };
  }
} 