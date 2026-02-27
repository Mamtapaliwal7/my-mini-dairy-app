// firebase/createUserProfile.js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.client';

export const createUserProfile = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    email: user.email,
    displayName: user.displayName || '',
    createdAt: serverTimestamp(),
  }, { merge: true });
};
