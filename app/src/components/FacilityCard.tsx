import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type FacilityCardProps = {
  name: string;
  distance: string;
  type?: string;
};

export default function FacilityCard({
  name,
  distance,
  type = 'Clinic',
}: FacilityCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>{type} • {distance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#616161',
  },
});
