import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type IndicatorBadgeProps = {
  label: string;
};

export default function IndicatorBadge({ label }: IndicatorBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    color: '#37474F',
    fontSize: 12,
    fontWeight: '600',
  },
});
