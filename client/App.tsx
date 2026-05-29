import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App(): React.JSX.Element {
  const { isAuthenticated } = useAuthStore();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      <NavigationContainer>
        <RootNavigator isAuthenticated={isAuthenticated} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
