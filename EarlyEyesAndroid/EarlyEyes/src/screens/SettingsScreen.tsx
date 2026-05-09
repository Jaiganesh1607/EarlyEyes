import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import LanguagePicker from '../components/LanguagePicker';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <LanguagePicker />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About EarlyEyes</Text>
        <Text style={styles.text}>
          EarlyEyes provides offline early warning guidance. It does not replace a
          doctor.
        </Text>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    color: '#616161',
  },
});
