import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Assessment, RiskLevel } from '../types/assessment';
import { getAssessmentById, getAssessments } from '../db/AssessmentRepository';
import BrandHeader from '../components/BrandHeader';
import { BottomTabParamList } from '../navigation/AppNavigator';

export default function HistoryScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<BottomTabParamList, 'History'>>();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setIsLoading(true);
          console.log('[History] loading assessments');
          const rows = await getAssessments();
          if (isActive) {
            setAssessments(rows);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
            console.log('[History] load complete');
          }
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleOpenResult = useCallback(
    async (id: string) => {
      const assessment = await getAssessmentById(id);
      if (assessment) {
        navigation.navigate('InputMethod', {
          screen: 'Result',
          params: { assessmentId: assessment.id, result: assessment },
        });
      }
    },
    [navigation],
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, Assessment[]>();
    assessments.forEach((item) => {
      const label = formatMonth(item.timestamp);
      const list = grouped.get(label) ?? [];
      list.push(item);
      grouped.set(label, list);
    });
    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [assessments]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <BrandHeader size={26} />
      </View>

      <Text style={styles.title}>History</Text>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading history...</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={styles.listContainer}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, riskStyles[item.risk_level].border]}
              onPress={() => handleOpenResult(item.id)}
            >
              <View
                style={[
                  styles.cardIcon,
                  riskStyles[item.risk_level].iconBackground,
                ]}
              >
                <Icon
                  name={riskStyles[item.risk_level].icon}
                  size={18}
                  color={riskStyles[item.risk_level].iconColor}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTimestamp}>
                  {formatDateTime(item.timestamp)}
                </Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.plain_language || item.indicators[0] || 'Assessment'}
                </Text>
                <Text style={[styles.cardSubtitle, riskStyles[item.risk_level].text]}>
                  {riskStyles[item.risk_level].label}
                </Text>
                <Text style={styles.cardDetail} numberOfLines={2}>
                  {item.indicators[0] || 'No indicators recorded.'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No assessments yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatMonth(timestamp: number) {
  return new Date(timestamp)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} • ${timePart}`;
}

const riskStyles: Record<
  RiskLevel,
  {
    label: string;
    icon: string;
    iconColor: string;
    iconBackground: { backgroundColor: string };
    border: { borderLeftColor: string };
    text: { color: string };
  }
> = {
  urgent: {
    label: 'Urgent Review Recommended',
    icon: 'alert',
    iconColor: '#B91C1C',
    iconBackground: { backgroundColor: '#FDE2E2' },
    border: { borderLeftColor: '#B91C1C' },
    text: { color: '#B91C1C' },
  },
  monitor: {
    label: 'Monitor & Rescan next week',
    icon: 'information',
    iconColor: '#8A5C00',
    iconBackground: { backgroundColor: '#FCECC8' },
    border: { borderLeftColor: '#8A5C00' },
    text: { color: '#8A5C00' },
  },
  ok: {
    label: 'No anomalies found',
    icon: 'check',
    iconColor: '#166534',
    iconBackground: { backgroundColor: '#DCFCE7' },
    border: { borderLeftColor: '#166534' },
    text: { color: '#166534' },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8F5F3',
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  listContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1A19',
    marginBottom: 10,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  list: {
    paddingBottom: 24,
    gap: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DBE7',
    borderLeftWidth: 6,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
  },
});
