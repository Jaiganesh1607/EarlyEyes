import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RiskLevel, riskLevelColors, riskLevelLabels } from '../constants/riskLevels';

type RiskCardProps = {
  level: RiskLevel;
  title?: string;
  description?: string;
};

export default function RiskCard({
  level,
  title,
  description,
}: RiskCardProps) {
  return (
    <View style={[styles.container, { borderColor: riskLevelColors[level] }]}
    >
      <View
        style={[styles.badge, { backgroundColor: riskLevelColors[level] }]}
      >
        <Text style={styles.badgeText}>{riskLevelLabels[level]}</Text>
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#4B4B4B',
  },
});
