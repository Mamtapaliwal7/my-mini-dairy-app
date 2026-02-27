import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadCustomersFromFirebase as downloadFromSyncManager } from './SyncManager';

const CUSTOMER_KEY = 'customers';

/**
 * Downloads all customers from Firebase and saves them to local storage.
 * Uses the new subcollection structure for entries.
 * @param {string} userId - The current user's UID
 * @returns {Promise<{count: number, success: boolean}>}
 */
export async function downloadCustomersFromFirebase(userId) {
  if (!userId) {
    return { count: 0, success: false };
  }
  
  try {
    // Use the updated download function from SyncManager
    const result = await downloadFromSyncManager(userId);
    return result;
  } catch (error) {
    console.error('Download failed:', error);
    return { count: 0, success: false };
  }
} 