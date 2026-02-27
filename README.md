## MyMiniDairyApp

MyMiniDairyApp is a React Native + Expo application for small dairy owners to manage customers, record daily milk collection, handle monthly billing, and keep a lightweight ledger with optional cloud backup via Firebase.

The app is **offline‑first**: all core features work from local storage, and you can sync to Firebase when a network connection is available.

---

## Features

- **Customer Management**
  - Add, edit, and delete customers.
  - View individual customer profiles and milk history.

- **Daily Milk Collection**
  - Quick entry screen to record daily milk quantity.
  - Register‑style screen (grid) to see and edit entries across a whole month.

- **Billing & Ledger**
  - Automatic calculation of total liters and amount due per month.
  - Carry‑forward of **advance** and **pending** amounts across months using a central billing utility.
  - Monthly ledger and customer summary screens, including PDF generation for statements.

- **Authentication & Sync**
  - Email/password authentication with Firebase Authentication.
  - Email verification and password reset flows.
  - Manual “Sync to Cloud” from the dashboard to back up local data to Firestore.

- **Offline‑First Design**
  - Uses `AsyncStorage` for the primary data store so the app works without internet.
  - Firebase is used as a backup/multi‑device sync layer, not as the main source of truth.

---

## Tech Stack

- **Mobile framework**: React Native (via Expo)
- **Navigation**: React Navigation (Native Stack + Drawer)
- **State management**: React Context (`AuthContext`, `CustomerContext`)
- **Local storage**: `@react-native-async-storage/async-storage`
- **Backend**: Firebase Authentication & Cloud Firestore
- **Other Expo services**: Notifications, FileSystem, Print, Sharing

---

## Architecture Overview

### Local‑First Data Model

- Customers, their milk entries, and billing data are stored locally in `AsyncStorage`.
- On app startup, `CustomerContext` loads customers from local storage and exposes them to the rest of the app.
- This approach ensures the app remains usable even with poor or no connectivity.

### Global State via Context

- **`AuthContext`**
  - Wraps Firebase `onAuthStateChanged`.
  - Exposes `user`, `loading`, and `logout()` to the rest of the app.
  - Used by the navigator to decide whether to show auth screens or the main app.

- **`CustomerContext`**
  - Single source of truth for customer data on the device.
  - Responsibilities:
    - Load and save `customers` to `AsyncStorage`.
    - Provide CRUD helpers (`addCustomer`, `updateCustomer`, `deleteCustomer`, `deleteMultipleCustomers`).
    - Manage per‑customer monthly billing and notification preferences.
    - Track sync state with `syncStatus` flags (`new`, `updated`, `deleted`, `synced`).
    - Trigger cloud sync via `syncAll(userId)` which delegates to the Firebase sync layer.

### Firebase & Cloud Sync

- **`src/firebase/firebase.client.js`**
  - Initializes Firebase app, `auth`, and `db` (Firestore).
  - Reads configuration from Expo environment variables (`EXPO_PUBLIC_FIREBASE_*`).

- **`src/firebase/firebaseCentral.js`**
  - **`authService`**: wraps common auth flows:
    - `register(email, password, displayName)` with email verification.
    - `login(email, password)` with email‑verified check.
    - `logout()`, `resetPassword(email)`, `resendEmailVerification()`.
  - **`dbService`**: encapsulates Firestore access around a secure, per‑user path:
    - Customers are stored under `users/{userId}/customers/{customerId}`.
    - Entries are stored in subcollections:
      - `users/{userId}/customers/{customerId}/entries/{YYYY-MM}/entries/{entryId}`.
    - Includes helpers for:
      - CRUD on customers.
      - Adding/updating/deleting single entries.
      - Batch add/update of multiple entries.
      - Updating monthly billing.

- **`src/firebase/SyncManager.js`**
  - Implements the main sync flow between local `AsyncStorage` and Firestore.
  - Key behavior:
    - Reads all local customers from `AsyncStorage`.
    - Reads all remote customers for the current user from Firestore.
    - Uses Firestore `writeBatch` to:
      - Add/update changed or new customers.
      - Delete customers marked `syncStatus: 'deleted'` (including their sub‑entries).
      - Optionally remove remote customers that no longer exist locally.
    - Uses `dbService.entries` to sync entry subcollections.

- **`src/firebase/downloadFromCloud.js`**
  - Downloads all customers and all their entries from Firestore.
  - Merges the data into the local format and overwrites the local `customers` key in `AsyncStorage`.

### Billing Logic

- **`src/utils/billingUtils.js`**
  - Contains `carryForwardBilling`, a pure function responsible for:
    - Calculating the amount due for a selected month from entries and milk price.
    - Carrying forward **advance** or **pending** balances to future months.
    - Propagating milk price into future months when not explicitly set.
  - This utility is used by register‑style screens to keep monthly balances consistent as entries and billing values change.

---

## Project Structure

A simplified view of the key folders:

```text
.
├─ App.js                 # App entry, providers, notification handler
├─ navigation/
│  └─ AppNavigator.js     # Stack + Drawer navigation, auth gating
├─ src/
│  ├─ context/
│  │  ├─ AuthContext.js
│  │  └─ CustomerContext.js
│  ├─ firebase/
│  │  ├─ firebase.client.js
│  │  ├─ firebaseCentral.js
│  │  ├─ SyncManager.js
│  │  └─ downloadFromCloud.js
│  ├─ notifications/
│  │  └─ DailyEntryReminder.js
│  ├─ screens/
│  │  ├─ DashboardScreen.js
│  │  ├─ LoginScreen.js
│  │  ├─ SignupScreen.js
│  │  ├─ DailyCollectionScreen/
│  │  ├─ MonthlyMilkLedger/
│  │  ├─ CustomerSummaryScreen/
│  │  └─ RegisterTest/
│  └─ utils/
│     └─ billingUtils.js
└─ env-template.txt       # Template for environment variables
```

---

## Environment Variables

Firebase configuration is provided via Expo public environment variables.  
Copy `env-template.txt` to `.env` and fill in your own Firebase project values:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> **Important**: Never commit your real `.env` file to version control.  
> Keep only `env-template.txt` in the repository as a reference.

---

## Installation & Running

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Firebase**

   - Create a new Firebase project if you don’t already have one.
   - Enable **Email/Password** authentication.
   - Create a Cloud Firestore database.
   - Copy your Firebase web config into `.env` (see the *Environment Variables* section above).

3. **Start the app**

   ```bash
   npm start
   ```

   This will start the Expo development server.  
   You can then:

   - Press `a` to run on an Android emulator/device.
   - Press `i` to run on an iOS simulator (macOS only).
   - Or scan the QR code with the Expo Go app.

---

## Usage Notes

- **Sync to Cloud**
  - After logging in, open the **Dashboard** and tap the **“Sync to Cloud”** button to push local changes to Firebase.
  - Sync can be triggered any time; it is designed to upload only new/changed items and clean up deleted ones.

- **Offline Behavior**
  - You can add/edit customers and daily entries while offline.
  - Changes are stored locally and will be synced the next time you tap **“Sync to Cloud”** with an internet connection.

- **Email Verification**
  - New users receive an email verification link.
  - Login is blocked until the email is verified; the login screen allows resending the verification email.

---

## Development Notes

- The codebase favors **pure utility functions** (e.g. `billingUtils`) and **context providers** for shared state.
- Complex UI behavior (like the monthly register grid) is extracted into custom hooks (`useRegisterTestLogic`, `useDailyCollection`) to keep screen components more readable.
- When updating core data models (customer, entry, billing):
  - Update the shapes consistently across:
    - `CustomerContext`
    - Firebase services (`firebaseCentral.js`, `SyncManager.js`)
    - Any screens or hooks that rely on those fields.

---


