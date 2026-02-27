import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,sendEmailVerification, updateProfile, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase.client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Authentication Services
export const authService = {
  // Register new user
  register: async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
       if (!userCredential.user.emailVerified) {
      // Optional: sign them out if login is blocked
      await signOut(auth);
      throw new Error('Please verify your email before logging in.');
    }
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  resetPassword: async (email) => {
  if (!email) {
    throw new Error('Please enter your email address.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No user found with this email.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is invalid.');
    } else {
      throw new Error('Failed to send reset email. Please try again.');
    }
  }
},

 resendEmailVerification: async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No user is currently logged in.');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified.');
  }

  await sendEmailVerification(user);
},


  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

// Database Services with NEW Subcollection Structure
export const dbService = {
  // Customer Operations (without entries array)
  customers: {
    // Add new customer
    add: async (userId, customerData) => {
      try {
        const customerRef = doc(collection(db, 'users', userId, 'customers'));
        const newCustomer = {
          id: customerRef.id,
          ...customerData,
          monthlyBilling: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(customerRef, newCustomer);
        return newCustomer;
      } catch (error) {
        throw error;
      }
    },

    // Get all customers for a user
    getAll: async (userId) => {
      try {
        const customersRef = collection(db, 'users', userId, 'customers');
        const querySnapshot = await getDocs(customersRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        throw error;
      }
    },

    // Get customer by ID
    getById: async (userId, customerId) => {
      try {
        const customerRef = doc(db, 'users', userId, 'customers', customerId);
        const customerSnap = await getDoc(customerRef);
        return customerSnap.exists() ? { id: customerSnap.id, ...customerSnap.data() } : null;
      } catch (error) {
        throw error;
      }
    },

    // Update customer
    update: async (userId, customerId, updateData) => {
      try {
        const customerRef = doc(db, 'users', userId, 'customers', customerId);
        await updateDoc(customerRef, {
          ...updateData,
          updatedAt: new Date().toISOString()
        });
        return { id: customerId, ...updateData };
      } catch (error) {
        throw error;
      }
    },

    // Delete customer
    delete: async (userId, customerId) => {
      try {
        await deleteDoc(doc(db, 'users', userId, 'customers', customerId));
      } catch (error) {
        throw error;
      }
    }
  },

  // Entry Operations with NEW Subcollection Structure
  entries: {
    // Add or update entry
    addOrUpdate: async (userId, customerId, entryData) => {
      try {
        const date = new Date(entryData.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Create entry ID from date
        const entryId = entryData.date; // Using date as ID for easy lookup
        
        const entryRef = doc(db, 'users', userId, 'customers', customerId, 'entries', monthKey, 'entries', entryId);
        
        const entry = {
          id: entryId,
          date: entryData.date,
          morning: entryData.morning || 0,
          evening: entryData.evening || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(entryRef, entry, { merge: true });
        return entry;
      } catch (error) {
        throw error;
      }
    },

    // Get entries for a customer in a specific month
    getByMonth: async (userId, customerId, year, month) => {
      try {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const entriesRef = collection(db, 'users', userId, 'customers', customerId, 'entries', monthKey, 'entries');
        const querySnapshot = await getDocs(entriesRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        // If the month collection doesn't exist, return empty array
        if (error.code === 'not-found') {
          return [];
        }
        throw error;
      }
    },

    // Get all entries for a customer
    getAllForCustomer: async (userId, customerId) => {
      try {
        const monthsRef = collection(db, 'users', userId, 'customers', customerId, 'entries');
        const monthsSnapshot = await getDocs(monthsRef);
        console.log('Fetching months for customer:', customerId);
        console.log('Months found:', monthsSnapshot.docs.map(doc => doc.id));

        const allEntries = [];

        for (const monthDoc of monthsSnapshot.docs) {
          const entriesRef = collection(monthDoc.ref, 'entries');
          const entriesSnapshot = await getDocs(entriesRef);
          console.log(`Entries for month ${monthDoc.id}:`, entriesSnapshot.docs.map(doc => doc.data()));

          entriesSnapshot.docs.forEach(doc => {
            allEntries.push({ id: doc.id, ...doc.data() });
          });
        }

        console.log('All entries fetched for customer', customerId, ':', allEntries);
        return allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
      } catch (error) {
        throw error;
      }
    },

    // Delete entry
    delete: async (userId, customerId, entryDate) => {
      try {
        const date = new Date(entryDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const entryId = entryDate;
        
        const entryRef = doc(db, 'users', userId, 'customers', customerId, 'entries', monthKey, 'entries', entryId);
        await deleteDoc(entryRef);
        
        return true;
      } catch (error) {
        throw error;
      }
    },

    // Batch operations for multiple entries
    batchAddOrUpdate: async (userId, customerId, entries) => {
      try {
        const batch = writeBatch(db);
        
        for (const entryData of entries) {
          const date = new Date(entryData.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const entryId = entryData.date;
          
          const entryRef = doc(db, 'users', userId, 'customers', customerId, 'entries', monthKey, 'entries', entryId);
          
          const entry = {
            id: entryId,
            date: entryData.date,
            morning: entryData.morning || 0,
            evening: entryData.evening || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          batch.set(entryRef, entry, { merge: true });
        }
        
        await batch.commit();
        return true;
      } catch (error) {
        throw error;
      }
    }
  },

  // Billing Operations
  billing: {
    // Update monthly billing
    updateMonthly: async (userId, customerId, month, billingData) => {
      try {
        const customerRef = doc(db, 'users', userId, 'customers', customerId);
        const customerSnap = await getDoc(customerRef);
        
        if (!customerSnap.exists()) {
          throw new Error('Customer not found');
        }

        const customer = customerSnap.data();
        const monthlyBilling = {
          ...customer.monthlyBilling,
          [month]: billingData
        };

        await updateDoc(customerRef, { monthlyBilling });
        return monthlyBilling;
      } catch (error) {
        throw error;
      }
    }
  },

  // Test Functions
  test: {
    // Verify customer data in Firebase
    verifyCustomerData: async (userId, customerId) => {
      try {
        const customerRef = doc(db, 'users', userId, 'customers', customerId);
        const customerSnap = await getDoc(customerRef);
        
        if (!customerSnap.exists()) {
          return {
            success: false,
            message: 'Customer not found in Firebase',
            data: null
          };
        }

        const firebaseData = customerSnap.data();
        return {
          success: true,
          message: 'Customer found in Firebase',
          data: firebaseData
        };
      } catch (error) {
        return {
          success: false,
          message: 'Error checking Firebase: ' + error.message,
          data: null
        };
      }
    },

    // Test entry operations
    testEntryOperations: async (userId, customerId) => {
      try {
        // Test adding an entry
        const testEntry = {
          date: new Date().toISOString().split('T')[0],
          morning: 5.5,
          evening: 4.2
        };
        
        await dbService.entries.addOrUpdate(userId, customerId, testEntry);

        // Test getting entries
        const entries = await dbService.entries.getAllForCustomer(userId, customerId);

        return {
          success: true,
          message: 'Entry operations test successful',
          entries: entries
        };
      } catch (error) {
        return {
          success: false,
          message: 'Entry operations test failed: ' + error.message,
          entries: []
        };
      }
    }
  }
};

// Export all services and hook
export default {
  auth: authService,
  db: dbService,
}; 