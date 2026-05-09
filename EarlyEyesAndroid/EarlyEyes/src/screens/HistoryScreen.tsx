import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import RiskCard from '../components/RiskCard';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>History</Text>
      <View style={styles.list}>
        <RiskCard level="monitor" title="April 12" description="Monitor closely" />
        <RiskCard level="ok" title="March 29" description="No urgent signs" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
});
