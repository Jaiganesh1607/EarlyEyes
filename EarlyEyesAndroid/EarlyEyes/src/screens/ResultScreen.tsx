import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import RiskCard from '../components/RiskCard';
import IndicatorBadge from '../components/IndicatorBadge';
import FacilityCard from '../components/FacilityCard';
import DisclaimerBanner from '../components/DisclaimerBanner';
import IconButton from '../components/IconButton';

export default function ResultScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Assessment Result</Text>
      <RiskCard
        level="urgent"
        title="Seek medical care now"
        description="Early signs of severe wasting were detected."
      />
      <View>
        <Text style={styles.sectionTitle}>What we noticed</Text>
        <View style={styles.badges}>
          <IndicatorBadge label="Visible muscle wasting" />
          <IndicatorBadge label="Swollen feet" />
          <IndicatorBadge label="Low energy" />
        </View>
      </View>
      <View>
        <Text style={styles.sectionTitle}>Nearest facility</Text>
        <FacilityCard name="Hope Nutrition Center" distance="2.1 km" />
      </View>
      <IconButton label="Share result" variant="secondary" />
      <DisclaimerBanner />
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
