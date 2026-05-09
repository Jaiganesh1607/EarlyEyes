import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import FacilityCard from '../components/FacilityCard';

export default function FacilityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Nearest Facilities</Text>
      <View style={styles.list}>
        <FacilityCard name="Hope Nutrition Center" distance="2.1 km" type="Clinic" />
        <FacilityCard name="City Health Post" distance="3.4 km" type="Hospital" />
        <FacilityCard name="Community Care" distance="4.2 km" type="Clinic" />
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
