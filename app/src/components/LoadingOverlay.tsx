import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LoadingOverlayProps = {
  title?: string;
  subtitle?: string;
};

export default function LoadingOverlay({
  title = 'Preparing your result…',
  subtitle = 'This usually takes a few seconds.',
}: LoadingOverlayProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E53935" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#616161',
    textAlign: 'center',
  },
});
