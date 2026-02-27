// utils/syncUtils.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/firebase.client'; // ✅ Adjusted path if needed
import { writeBatch, doc } from 'firebase/firestore';

const CUSTOMER_KEY = 'customers';

export const syncCustomersToFirebase = async (userId) => {
  if (!userId) {return false; }
  try {
    
    const raw = await AsyncStorage.getItem(CUSTOMER_KEY);
    const localCustomers = JSON.parse(raw || '[]');

    if (!Array.isArray(localCustomers)) {
      return false;
    }

    const batch = writeBatch(db);
    const updatedCustomers = [];
    let hasChanges = false;

    for (const customer of localCustomers) {
      
      const { syncStatus, id, ...rest } = customer;
      if (!id) continue;

      const docRef = doc(db, `users/${userId}/customers/${id}`);

      if (syncStatus === 'new' || syncStatus === 'updated') {
        
        batch.set(docRef, { id, ...rest }, { merge: true });
        updatedCustomers.push({ id, ...rest });
        hasChanges = true;
      } else if (syncStatus === 'deleted') {
        batch.delete(docRef);
        hasChanges = true;
      } else {
        updatedCustomers.push(customer); // already synced
      }
    }

    if (!hasChanges) {
      
      return true;
    }

    
    await batch.commit();
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(updatedCustomers));
    
    return true;

  } catch (error) {
      
    return false; // return false to let UI handle it
  }
};
