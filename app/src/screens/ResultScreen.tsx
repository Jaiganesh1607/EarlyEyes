import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Assessment, RiskLevel } from '../types/assessment';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function ResultScreen() {
  const route = useRoute();
  const params = route.params as RootStackParamList['Result'] | undefined;

  const assessment = useMemo<Assessment>(
    () =>
      params?.assessment ?? {
        id: 'sample',
        timestamp: Date.now(),
        risk_level: 'urgent',
        indicators: [
          'Abnormal white reflection in the left pupil.',
          'Asymmetry between the red reflex of both eyes.',
        ],
        plain_language: 'Potential Leukocoria Detected',
        tell_doctor:
          "I used a screening app that flagged a potential white reflex (leukocoria) in my child's left eye from a recent photo. I would like to schedule an urgent comprehensive eye exam.",
        facility_id: 'Pediatric Eye Center',
        language: 'en',
        input_type: 'photo',
        confidence: 82,
      },
    [params?.assessment],
  );

  const indicators = assessment.indicators.length
    ? assessment.indicators
    : assessment.plain_language
      ? [assessment.plain_language]
      : [];

  const risk = riskContent[assessment.risk_level as RiskLevel];

  const scanTimestamp = new Date(assessment.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton}>
            <Icon name="menu" size={22} color="#0E5FB3" />
          </Pressable>
          <Text style={styles.brand}>EarlyEyes</Text>
          <Pressable style={styles.iconButton}>
            <Icon name="account-circle-outline" size={24} color="#0E5FB3" />
          </Pressable>
        </View>

        <View style={[styles.alertBanner, { backgroundColor: risk.bannerColor }]}>
          <Icon name={risk.bannerIcon} size={18} color="#FFFFFF" />
          <Text style={styles.alertText}>{risk.bannerText}</Text>
        </View>

        <View style={styles.findingCard}>
          <View style={styles.findingIconWrap}>
            <Icon name={risk.findingIcon} size={20} color={risk.findingIconColor} />
          </View>
          <View style={styles.findingBody}>
            <Text style={styles.findingTitle}>
              {assessment.plain_language || 'Assessment Result'}
            </Text>
            <View style={styles.findingMeta}>
              <Icon name="calendar" size={14} color="#6B7280" />
              <Text style={styles.findingMetaText}>
                Scan taken {scanTimestamp}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What We Noticed</Text>
        <View style={styles.noticeList}>
          {indicators.map((item, index) => (
            <View key={`${assessment.id}-${index}`} style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>What to Tell Your Doctor</Text>
        <View style={styles.doctorCard}>
          <View style={styles.doctorQuote}>
            <View style={styles.quoteBar} />
            <Text style={styles.quoteText}>
              "{assessment.tell_doctor || 'Please review the screening results and advise next steps.'}"
            </Text>
          </View>
          <Pressable style={styles.copyButton}>
            <Icon name="content-copy" size={16} color="#1F2937" />
            <Text style={styles.copyText}>Copy Message</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Nearest Specialist Facility</Text>
        <View style={styles.facilityCard}>
          <View style={styles.mapPreview}>
            <Icon name="map-marker-radius" size={36} color="#E11D48" />
          </View>
          <View style={styles.facilityRow}>
            <View>
              <Text style={styles.facilityName}>
                {assessment.facility_id || 'Pediatric Eye Center'}
              </Text>
              <View style={styles.facilityMeta}>
                <Icon name="map-marker" size={14} color="#6B7280" />
                <Text style={styles.facilityMetaText}>2.4 miles away · Open Now</Text>
              </View>
            </View>
            <Pressable style={styles.directionsButton}>
              <Icon name="navigation" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.disclaimerText}>
          Disclaimer: EarlyEyes is a screening tool, not a diagnostic device. A
          clinical exam by a healthcare professional is strictly required to
          confirm any condition.
        </Text>

        <Pressable style={styles.shareButton}>
          <Icon name="share-variant" size={18} color="#FFFFFF" />
          <Text style={styles.shareText}>Share Report</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const riskContent: Record<
  RiskLevel,
  {
    bannerText: string;
    bannerColor: string;
    bannerIcon: string;
    findingIcon: string;
    findingIconColor: string;
  }
> = {
  urgent: {
    bannerText: 'Urgent: Medical Review Advised',
    bannerColor: '#B91C1C',
    bannerIcon: 'alert',
    findingIcon: 'eye',
    findingIconColor: '#B91C1C',
  },
  monitor: {
    bannerText: 'Monitor: Follow-up Recommended',
    bannerColor: '#8A5C00',
    bannerIcon: 'alert-circle-outline',
    findingIcon: 'eye',
    findingIconColor: '#8A5C00',
  },
  ok: {
    bannerText: 'No Urgent Issues Detected',
    bannerColor: '#166534',
    bannerIcon: 'check-circle',
    findingIcon: 'eye',
    findingIconColor: '#166534',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F3',
  },
  scrollContent: {
    padding: 24,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#B91C1C',
  },
  alertText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  findingCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 6,
    borderLeftColor: '#B91C1C',
  },
  findingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingBody: {
    flex: 1,
    gap: 6,
  },
  findingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  findingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  findingMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0E5FB3',
    marginTop: 8,
  },
  noticeList: {
    gap: 10,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  noticeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginTop: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  doctorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 14,
  },
  doctorQuote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFECEA',
    borderRadius: 12,
    padding: 12,
  },
  quoteBar: {
    width: 4,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  quoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1F2937',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9BF28D',
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  facilityCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  mapPreview: {
    height: 120,
    backgroundColor: '#6B93B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  facilityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  facilityMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  directionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0E5FB3',
    paddingVertical: 16,
    borderRadius: 999,
  },
  shareText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
