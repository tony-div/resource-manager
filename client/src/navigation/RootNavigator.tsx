import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StackParamList } from '../types';

import LoginScreen from '../screens/Auth/LoginScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import UnifiedInventoryScreen from '../screens/UnifiedInventory/UnifiedInventoryScreen';
import InventoryDetailScreen from '../screens/UnifiedInventory/InventoryDetailScreen';
import PackageDetailScreen from '../screens/UnifiedInventory/PackageDetailScreen';
import CreateReservationScreen from '../screens/UnifiedInventory/CreateReservationScreen';

const Stack = createNativeStackNavigator<StackParamList>();
const Tab = createBottomTabNavigator();

function DashboardTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a237e' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 4,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => null,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="UnifiedInventory"
        component={UnifiedInventoryScreen}
        options={{
          tabBarLabel: 'Inventory',
          title: 'Inventory & Packages',
        }}
      />
      <Tab.Screen
        name="CreateReservation"
        component={CreateReservationScreen}
        options={{
          tabBarLabel: 'Reserve',
          title: 'New Reservation',
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a237e' },
        headerTintColor: '#fff',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="InventoryDetail"
            component={InventoryDetailScreen}
            options={{ title: 'Item Details' }}
          />
          <Stack.Screen
            name="PackageDetail"
            component={PackageDetailScreen}
            options={{ title: 'Package Details' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
