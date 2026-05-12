import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator.tsx';
import { LanguageProvider } from './src/i18n';
import { getDB } from './src/services/db/DatabaseManager';

function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getDB().then(() => {
      if (isMounted) {
        setDbReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E5FB3" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
