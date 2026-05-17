import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useRoute, type RouteProp, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import type { ScanStackParamList } from '../navigation/AppNavigator';
import type { FinalAssessmentResult } from '../services/pipeline/AssessmentPipeline';
import type { DiseaseMatch } from '../services/rag/DiseaseScorer';
import { getAssessmentById } from '../db/AssessmentRepository';
import { useLanguage, t } from '../i18n';

export default function ResultScreen() {
  const route = useRoute<RouteProp<ScanStackParamList, 'Result'>>();
  const navigation = useNavigation<{ navigate: (screen: string, params?: Record<string, unknown>) => void } & Record<string, unknown>>();
  const { language } = useLanguage();
  const params = route.params;

  const [assessment, setAssessment] = useState<FinalAssessmentResult | null>(
    params?.result ?? null
  );
  const [loading, setLoading] = useState(false);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);

  useEffect(() => {
    if (params?.assessmentId && !params?.result) {
      setLoading(true);
      getAssessmentById(params.assessmentId)
        .then((stored) => {
          if (stored && stored.tell_doctor) {
            try {
              const parsed = JSON.parse(stored.tell_doctor) as FinalAssessmentResult;
              setAssessment(parsed);
            } catch (e) {
              console.warn('Failed to parse assessment JSON');
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [params?.assessmentId, params?.result]);

  const riskLevel = assessment?.final_risk_level ?? 'ok';
  const ragResult = assessment?.rag_result ?? null;
  const topDiseases = ragResult?.top_diseases ?? [];
  const primaryDisease = ragResult?.primary_disease ?? null;
  const imageAnalysis = assessment?.image_analysis ?? null;

  const riskConfig = useMemo(() => {
    switch (riskLevel) {
      case 'urgent':
        return { bg: '#DC2626', icon: '⚠️', label: t(language, 'risk_urgent') };
      case 'monitor':
        return { bg: '#D97706', icon: '⚡', label: t(language, 'risk_monitor') };
      default:
        return { bg: '#16A34A', icon: '✓', label: t(language, 'risk_ok') };
    }
  }, [riskLevel, language]);

  const handleCopyDoctorBrief = () => {
    if (!primaryDisease) return;
    const brief = `
EarlyEyes Doctor's Brief
Disease: ${primaryDisease.disease}
ICD-11: ${primaryDisease.icd11_code}
Age Group: ${primaryDisease.age_group}
MUAC: ${primaryDisease.who_muac_threshold}
Visual Signs: ${primaryDisease.matched_visual.join(', ')}
Symptoms: ${primaryDisease.matched_symptoms.join(', ')}
Actions: ${primaryDisease.immediate_actions.join('; ')}
    `.trim();
    Clipboard.setString(brief);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BrandHeader size={28} />
          <Pressable onPress={() => navigation.navigate('Scan')}>
            <Icon name="close" size={28} color="#000" />
          </Pressable>
        </View>

        {/* Section 1: Risk Banner */}
        <View style={[styles.riskBanner, { backgroundColor: riskConfig.bg }]}>
          <Text style={styles.riskIcon}>{riskConfig.icon}</Text>
          <View>
            <Text style={styles.riskText}>{riskConfig.label}</Text>
            <Text style={styles.detectedVia}>
              {t(language, 'detected_via')} {ragResult?.matched_by ?? 'none'}
            </Text>
          </View>
        </View>

        {/* Section 2: Possible Conditions */}
        <Text style={styles.sectionTitle}>{t(language, 'possible_conditions')}</Text>
        {topDiseases.length > 0 ? (
          topDiseases.map((d) => <DiseaseCard key={d.id} disease={d} language={language} />)
        ) : (
          <Text style={styles.emptyText}>{t(language, 'no_conditions_found')}</Text>
        )}

        {/* Section 3: What We Noticed */}
        <Text style={styles.sectionTitle}>{t(language, 'what_noticed')}</Text>
        {imageAnalysis && imageAnalysis.indicators.length > 0 ? (
          imageAnalysis.indicators.map((ind, i) => (
            <View key={i} style={[styles.indicatorCard, { borderLeftColor: riskConfig.bg }]}>
              <Text style={styles.indicatorText}>• {ind}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t(language, 'no_image_analysis')}</Text>
        )}

        {/* Section 4: What To Do Right Now */}
        <Text style={styles.sectionTitle}>{t(language, 'immediate_actions')}</Text>
        {primaryDisease ? (
          primaryDisease.immediate_actions.map((act, i) => (
            <Text key={i} style={styles.actionText}>{i + 1}. {act}</Text>
          ))
        ) : (
          <Text style={styles.emptyText}>{t(language, 'describe_symptoms_prompt')}</Text>
        )}

        {/* Section 5: Warning Signs */}
        {primaryDisease && primaryDisease.future_warnings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: '#B45309' }]}>{t(language, 'future_warnings')}</Text>
            {primaryDisease.future_warnings.slice(0, 4).map((warn, i) => (
              <Text key={i} style={styles.warningText}>⚠️ {warn}</Text>
            ))}
          </>
        )}

        {/* Section 6: Doctor Button */}
        <Pressable style={styles.doctorButton} onPress={() => setDoctorModalVisible(true)}>
          <Text style={styles.doctorButtonText}>What To Tell The Doctor</Text>
        </Pressable>

        {/* DEBUG TOGGLE */}
        <Pressable 
          onLongPress={() => setDebugVisible(!debugVisible)} 
          style={{ marginTop: 20, padding: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#DDD', fontSize: 10 }}>[Dev mode: Long press for raw output]</Text>
        </Pressable>

        {debugVisible && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugHeader}>RAW PIPELINE OUTPUT</Text>
            <Text style={styles.debugLabel}>Image Analysis:</Text>
            <Text style={styles.debugText}>{JSON.stringify(imageAnalysis, null, 2)}</Text>
            <Text style={styles.debugLabel}>Voice Transcript:</Text>
            <Text style={styles.debugText}>{assessment?.raw_voice}</Text>
            <Text style={styles.debugLabel}>Text Input:</Text>
            <Text style={styles.debugText}>{assessment?.raw_text}</Text>
            <Text style={styles.debugLabel}>RAG Results (all):</Text>
            <Text style={styles.debugText}>{JSON.stringify(ragResult, null, 2)}</Text>
          </View>
        )}
      </ScrollView>

      {/* Section 7: Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{t(language, 'disclaimer')}</Text>
      </View>

      {/* Modal */}
      <Modal visible={doctorModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Doctor's Brief</Text>
            {primaryDisease ? (
              <ScrollView>
                <Text style={styles.modalLabel}>Disease: <Text style={styles.modalValue}>{primaryDisease.disease}</Text></Text>
                <Text style={styles.modalLabel}>ICD-11: <Text style={styles.modalValue}>{primaryDisease.icd11_code}</Text></Text>
                <Text style={styles.modalLabel}>Age Group: <Text style={styles.modalValue}>{primaryDisease.age_group}</Text></Text>
                {primaryDisease.who_muac_threshold && (
                  <Text style={styles.modalLabel}>MUAC: <Text style={styles.modalValue}>{primaryDisease.who_muac_threshold}</Text></Text>
                )}
                <Text style={styles.modalLabel}>{t(language, 'visual_signs')}:</Text>
                <Text style={styles.modalValue}>{primaryDisease.matched_visual.join(', ')}</Text>
                <Text style={styles.modalLabel}>{t(language, 'matched_symptoms')}:</Text>
                <Text style={styles.modalValue}>{primaryDisease.matched_symptoms.join(', ')}</Text>
                <Text style={styles.modalLabel}>Recommended Actions:</Text>
                {primaryDisease.immediate_actions.map((act, i) => (
                  <Text key={i} style={styles.modalListItem}>{i + 1}. {act}</Text>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.copyBtn} onPress={handleCopyDoctorBrief}>
                <Text style={styles.copyBtnText}>Copy Brief</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={() => setDoctorModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DiseaseCard({ disease, language }: { disease: DiseaseMatch; language: string }) {
  const confColor = disease.confidence_percent > 70 ? '#DC2626' : disease.confidence_percent > 40 ? '#D97706' : '#16A34A';
  return (
    <View style={styles.diseaseCard}>
      <Text style={styles.diseaseName}>{disease.disease}</Text>
      <View style={styles.categoryBadge}><Text style={styles.categoryText}>{disease.category}</Text></View>
      <Text style={styles.ageText}>{t(language, 'age_group')}: {disease.age_group}</Text>
      {disease.who_muac_threshold && <Text style={styles.ageText}>MUAC: {disease.who_muac_threshold}</Text>}
      
      <View style={styles.confTrack}><View style={[styles.confFill, { width: `${disease.confidence_percent}%`, backgroundColor: confColor }]} /></View>
      <Text style={[styles.confText, { color: confColor }]}>{disease.confidence_percent}% match</Text>
      
      {disease.matched_visual.length > 0 && (
        <Text style={styles.signText}>{t(language, 'visual_signs')}: {disease.matched_visual.join(', ')}</Text>
      )}
      {disease.matched_symptoms.length > 0 && (
        <Text style={styles.signText}>{t(language, 'matched_symptoms')}: {disease.matched_symptoms.join(', ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  riskBanner: { borderRadius: 8, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  riskIcon: { fontSize: 32 },
  riskText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  detectedVia: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 12, color: '#111' },
  diseaseCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  diseaseName: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  categoryText: { fontSize: 11, color: '#374151' },
  ageText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  confTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 8 },
  confFill: { height: '100%', borderRadius: 3 },
  confText: { fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginTop: 2 },
  signText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },
  indicatorCard: { padding: 12, backgroundColor: '#F9FAFB', borderLeftWidth: 4, marginBottom: 8, borderRadius: 4 },
  indicatorText: { fontSize: 14, color: '#374151' },
  actionText: { fontSize: 14, color: '#374151', marginBottom: 6 },
  warningText: { fontSize: 13, color: '#92400E', marginBottom: 6 },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },
  doctorButton: { backgroundColor: '#1D4ED8', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  doctorButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  disclaimer: { backgroundColor: '#FEF3C7', borderTopWidth: 1, borderTopColor: '#D97706', padding: 12, position: 'absolute', bottom: 0, left: 0, right: 0 },
  disclaimerText: { fontSize: 12, color: '#92400E', textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 8, color: '#374151' },
  modalValue: { fontWeight: 'normal', color: '#111' },
  modalListItem: { fontSize: 14, color: '#111', marginLeft: 8, marginTop: 4 },
  modalActions: { marginTop: 20, gap: 10 },
  copyBtn: { backgroundColor: '#1D4ED8', padding: 12, borderRadius: 8, alignItems: 'center' },
  copyBtnText: { color: '#FFF', fontWeight: 'bold' },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#6B7280' },
  debugPanel: { marginTop: 20, padding: 12, backgroundColor: '#F0F0F0', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  debugHeader: { fontWeight: 'bold', color: '#666', marginBottom: 8 },
  debugLabel: { fontWeight: 'bold', marginTop: 8, fontSize: 12 },
  debugText: { fontSize: 10, color: '#444', fontFamily: 'monospace' },
});
