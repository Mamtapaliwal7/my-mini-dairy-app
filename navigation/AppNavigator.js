import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useCheckAllNotifications } from '../src/notifications/DailyEntryReminder';
import { useAuth } from '../src/context/AuthContext';

// Screens
import LoginScreen from '../src/screens/LoginScreen';
import SignupScreen from '../src/screens/SignupScreen';
import DashboardScreen from '../src/screens/DashboardScreen';
import MenuScreen from '../src/screens/MenuScreen';
import CustomerProfileScreen from '../src/screens/CustomerProfileScreen';
import AddCustomerScreen from '../src/screens/AddCustomerScreen';
import AddEntryScreen from '../src/screens/AddEntryScreen';
import EditCustomerScreen from '../src/screens/EditCustomerScreen';
import MilkHistoryScreen from '../src/screens/MilkHistoryScreen';
import EditEntryScreen from '../src/screens/EditEntryScreen';
import UserProfileScreen from '../src/screens/UserProfileScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import DailyCollectionScreen from '../src/screens/DailyCollectionScreen/DailyCollectionScreen';
import MonthlyMilkLedgerScreen from '../src/screens/MonthlyMilkLedger/MonthlyMilkLedgerScreen';
import DeleteCustomerScreen from '../src/screens/DeleteCustomerScreen';
import ForgotPasswordScreen from '../src/screens/ForgotPasswordScreen';
import RegisterTestScreen from '../src/screens/RegisterTest/RegisterTestScreen';
import CustomerSummaryScreen from '../src/screens/CustomerSummaryScreen/CustomerSummaryScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
};

// 🔹 App Navigation Container (Stack only – no Drawer, use Menu screen instead)
export default function AppNavigator() {
  useCheckAllNotifications();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName={user ? 'Dashboard' : 'Login'}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="MyProfile" component={UserProfileScreen} />
            <Stack.Screen name="DailyCollection" component={DailyCollectionScreen} />
            <Stack.Screen name="MonthlyMilkLedger" component={MonthlyMilkLedgerScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RegisterTest" component={RegisterTestScreen} />
            <Stack.Screen name="CustomerSummary" component={CustomerSummaryScreen} />
            <Stack.Screen name="DeleteCustomers" component={DeleteCustomerScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
        <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
        <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
        <Stack.Screen name="AddEntry" component={AddEntryScreen} />
        <Stack.Screen name="EditCustomer" component={EditCustomerScreen} />
        <Stack.Screen name="MilkHistory" component={MilkHistoryScreen} />
        <Stack.Screen name="EditEntry" component={EditEntryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
