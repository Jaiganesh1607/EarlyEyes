import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LoadingOverlay from '../components/LoadingOverlay';
import IconButton from '../components/IconButton';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function ProcessingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Processing</Text>
      <LoadingOverlay
        title="Analyzing input…"
        subtitle="Checking health guidelines and preparing results."
      />
      <View style={styles.steps}>
        <Text style={styles.step}>• Analyzing photo</Text>
        <Text style={styles.step}>• Checking health guidelines</Text>
        <Text style={styles.step}>• Preparing your result</Text>
      </View>
      <IconButton
        label="View Result"
        variant="secondary"
        onPress={() => navigation.navigate('Result')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  steps: {
    gap: 6,
  },
  step: {
    color: '#616161',
    fontSize: 13,
  },
});
