import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
import { getAssessmentById } from '../db/AssessmentRepository';
import { useLanguage, t } from '../i18n';
import type { DiseaseMatch } from '../services/rag/DiseaseScorer';
import type { AnalysisResult } from '../services/cv/ImageAnalysisService';
import type { DiseaseChunk } from '../services/rag/ChunkLoader';

export default function ResultScreen() {
  const route = useRoute<RouteProp<ScanStackParamList, 'Result'>>();
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const params = route.params;

  // ── new contract fields ──
  const imageUri: string | undefined = params?.imageUri;
  const analysis: AnalysisResult | undefined = params?.analysis;
  const diagnosis: string | undefined = params?.diagnosis;
  const chunks: DiseaseChunk[] | undefined = params?.chunks;

  // ── legacy fallback: assessment object ──
  const [assessment, setAssessment] = useState<any>(params?.result ?? null);
  const [loading, setLoading] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);

  useEffect(() => {
    if (params?.assessmentId && !params?.result) {
      setLoading(true);
      getAssessmentById(params.assessmentId)
        .then((stored) => {
          if (stored && stored.tell_doctor) {
            try {
              const parsed = JSON.parse(stored.tell_doctor);
              setAssessment(parsed);
            } catch (e) {
              setAssessment(stored);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [params?.assessmentId, params?.result]);

  // ── derive display data: prefer new contract, fall back to legacy ──
  const effectiveAnalysis: AnalysisResult | null =
    analysis ?? assessment?.image_analysis ?? null;
  const effectiveDiagnosis: string =
    diagnosis ?? assessment?.diagnosis ?? '';
  const effectiveChunks: DiseaseChunk[] =
    chunks ?? [];

  const ragResult = assessment?.rag_result ?? null;
  const primaryMatch: DiseaseMatch | null = ragResult?.primary_disease ?? null;

  const riskLevel =
    effectiveAnalysis?.risk_level ??
    assessment?.final_risk_level ??
    assessment?.risk_level ??
    'ok';

  const riskConfig = useMemo(() => {
    switch (riskLevel) {
      case 'urgent':
        return { bg: '#B91C1C', icon: 'alert-circle', label: 'Urgent: Medical Review Advised' };
      case 'monitor':
        return { bg: '#D97706', icon: 'clock-outline', label: 'Monitor: Symptoms Noticed' };
      default:
        return { bg: '#059669', icon: 'check-circle', label: 'Healthy: No Issues Flagged' };
    }
  }, [riskLevel]);

  const handleCopyDoctorBrief = () => {
    const brief = `EarlyEyes Assessment: ${primaryMatch?.disease || effectiveDiagnosis || 'General Condition'}. indicators: ${effectiveAnalysis?.indicators?.join(', ') || 'N/A'}`;
    Clipboard.setString(brief);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1D4ED8" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BrandHeader size={26} layout="row" />
          <Pressable onPress={() => navigation.navigate('Scan')}>
            <Icon name="menu" size={26} color="#1F2937" />
          </Pressable>
        </View>

        {/* 1. RISK BANNER */}
        <View style={[styles.riskBanner, { backgroundColor: riskConfig.bg }]}>
          <Icon name={riskConfig.icon} size={24} color="#FFF" />
          <Text style={styles.riskText}>{riskConfig.label}</Text>
        </View>

        {/* 2. CAPTURED IMAGE */}
        {imageUri ? (
          <View style={styles.imageCard}>
            <Text style={styles.sectionTitle}>Captured Image</Text>
            <Image source={{ uri: imageUri }} style={styles.capturedImage} resizeMode="contain" />
          </View>
        ) : null}

        {/* 3. PRIMARY DIAGNOSTIC CARD */}
        <View style={styles.primaryCard}>
          <View style={[styles.accentBar, { backgroundColor: riskConfig.bg }]} />
          <View style={styles.iconCircle}>
            <Icon name="eye-outline" size={28} color={riskConfig.bg} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.primaryTitle}>
              {primaryMatch?.disease || effectiveDiagnosis || 'Condition Analysis'}
            </Text>
            <Text style={styles.primaryDate}>
              Scan taken {new Date(assessment?.timestamp || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* 4. STRUCTURED IMAGE ANALYSIS */}
        {effectiveAnalysis ? (
          <>
            <Text style={styles.sectionTitle}>Image Analysis Results</Text>

            {/* Indicators */}
            {effectiveAnalysis.indicators?.length ? (
              <>
                <Text style={styles.subsectionLabel}>Visual Indicators</Text>
                {effectiveAnalysis.indicators.map((ind: string, i: number) => (
                  <View key={i} style={styles.indicatorRow}>
                    <View style={styles.blueDot} />
                    <Text style={styles.indicatorText}>{ind}</Text>
                  </View>
                ))}
              </>
            ) : null}

            {/* Skin Findings */}
            {effectiveAnalysis.skin_findings?.length ? (
              <>
                <Text style={styles.subsectionLabel}>Skin Findings</Text>
                {effectiveAnalysis.skin_findings.map((sf, i) => (
                  <View key={i} style={styles.findingRow}>
                    <Icon name="skin" size={16} color="#6B7280" />
                    <Text style={styles.findingName}>{sf.name}</Text>
                    <Text style={styles.findingConf}>{(sf.confidence * 100).toFixed(0)}%</Text>
                  </View>
                ))}
              </>
            ) : null}

            {/* EfficientNet Flags */}
            {effectiveAnalysis.efficientnet_flags?.length ? (
              <>
                <Text style={styles.subsectionLabel}>Model Flags</Text>
                {effectiveAnalysis.efficientnet_flags.map((flag: string, i: number) => (
                  <View key={i} style={styles.flagChip}>
                    <Text style={styles.flagText}>{flag}</Text>
                  </View>
                ))}
              </>
            ) : null}

            {/* Structural Scores */}
            <Text style={styles.subsectionLabel}>Structural Assessment</Text>
            <View style={styles.structuralGrid}>
              {([
                ['Arm Wasting', effectiveAnalysis.structural.arm_wasting_score],
                ['Rib Visibility', effectiveAnalysis.structural.rib_visibility_score],
                ['Limb Symmetry', effectiveAnalysis.structural.limb_symmetry_score],
                ['Facial Wasting', effectiveAnalysis.structural.facial_wasting_score],
                ['Sunken Eyes', effectiveAnalysis.structural.sunken_eyes_score],
              ] as [string, number][]).map(([label, score]) => (
                <View key={label} style={styles.structuralItem}>
                  <Text style={styles.structuralLabel}>{label}</Text>
                  <View style={styles.scoreBarTrack}>
                    <View style={[styles.scoreBarFill, { width: `${Math.min(score * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.scoreValue}>{score.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            {/* Confidence */}
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Analysis Confidence</Text>
              <Text style={styles.confidenceValue}>
                {((effectiveAnalysis.confidence ?? 0) * 100).toFixed(0)}%
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>No image analysis data available.</Text>
        )}

        {/* 5. LLM DIAGNOSIS */}
        {effectiveDiagnosis ? (
          <>
            <Text style={styles.sectionTitle}>AI Diagnosis</Text>
            <View style={styles.diagnosisBox}>
              <Icon name="robot-outline" size={20} color="#1D4ED8" style={styles.diagnosisIcon} />
              <Text style={styles.diagnosisText}>{effectiveDiagnosis}</Text>
            </View>
          </>
        ) : null}

        {/* 6. WHAT WE NOTICED (legacy fallback) */}
        {!effectiveAnalysis?.indicators?.length && assessment?.image_analysis?.indicators?.length ? (
          <>
            <Text style={styles.sectionTitle}>What We Noticed</Text>
            {assessment.image_analysis.indicators.map((ind: string, i: number) => (
              <View key={i} style={styles.indicatorRow}>
                <View style={styles.blueDot} />
                <Text style={styles.indicatorText}>{ind}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* 7. DOCTOR BRIEF */}
        <Text style={styles.sectionTitle}>What To Tell Your Doctor</Text>
        <View style={styles.briefBox}>
          <View style={styles.briefBorder} />
          <Text style={styles.briefText}>
            "I used a screening app that flagged a potential {primaryMatch?.disease || effectiveDiagnosis || 'symptom'} in my child. 
            The system noticed: {effectiveAnalysis?.indicators?.[0] || 'visual changes'}. 
            I request a clinical review."
          </Text>
        </View>
        <Pressable style={styles.copyBtn} onPress={handleCopyDoctorBrief}>
          <Icon name="content-copy" size={20} color="#065F46" />
          <Text style={styles.copyText}>Copy Message</Text>
        </Pressable>

        {/* 8. RAG CHUNK ATTRIBUTION */}
        {effectiveChunks.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Sources</Text>
            <Text style={styles.subsectionLabel}>
              Knowledge base entries used for this diagnosis:
            </Text>
            {effectiveChunks.map((chunk) => (
              <View key={chunk.id} style={styles.sourceCard}>
                <View style={styles.sourceHeader}>
                  <Icon name="book-open-variant" size={18} color="#1D4ED8" />
                  <Text style={styles.sourceDisease}>{chunk.disease}</Text>
                  <View style={styles.sourceCategory}>
                    <Text style={styles.sourceCategoryText}>{chunk.category}</Text>
                  </View>
                </View>
                <Text style={styles.sourceDesc} numberOfLines={3}>
                  {chunk.description}
                </Text>
                {chunk.metadata?.sources?.length ? (
                  <View style={styles.sourceLinks}>
                    {chunk.metadata.sources.map((src, i) => (
                      <View key={i} style={styles.sourceLinkRow}>
                        <Icon name="link-variant" size={12} color="#6B7280" />
                        <Text style={styles.sourceLinkLabel}>{src.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {chunk.icd11_code ? (
                  <Text style={styles.icdCode}>ICD-11: {chunk.icd11_code}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {/* 9. NEAREST FACILITY */}
        <Text style={styles.sectionTitle}>Nearest Specialist Facility</Text>
        <View style={styles.mapPlaceholder}>
          <View style={styles.pinBg}>
            <Icon name="map-marker" size={32} color="#B91C1C" />
          </View>
        </View>
        <View style={styles.facilityFooter}>
          <Text style={styles.facilityName}>Pediatric Eye Center</Text>
          <Icon name="send-circle" size={40} color="#1D4ED8" />
        </View>

        {/* 10. DEBUG */}
        <Pressable onLongPress={() => setDebugVisible(!debugVisible)} style={styles.debugTrigger}>
          <Text style={styles.debugTriggerText}>Pipeline Version 4.5.1 (Offline Verified)</Text>
        </Pressable>

        {debugVisible && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugLabel}>TRANSCRIPT:</Text>
            <Text style={styles.debugCode}>{assessment?.raw_voice || 'None'}</Text>
            <Text style={styles.debugLabel}>MATCHES:</Text>
            {ragResult?.top_diseases?.map((d: any) => (
              <Text key={d.id} style={styles.debugCode}>- {d.disease} ({d.confidence_percent}%)</Text>
            ))}
            <Text style={styles.debugLabel}>CHUNKS USED:</Text>
            {effectiveChunks.length > 0
              ? effectiveChunks.map((c) => (
                  <Text key={c.id} style={styles.debugCode}>- {c.disease} ({c.category})</Text>
                ))
              : <Text style={styles.debugCode}>None</Text>}
          </View>
        )}
      </ScrollView>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>EarlyEyes is a screening aid, not a medical diagnosis.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  riskBanner: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  riskText: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  // Captured image
  imageCard: { marginBottom: 20 },
  capturedImage: { width: '100%', height: 240, borderRadius: 16, backgroundColor: '#E5E7EB' },

  // Primary card
  primaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowColor: '#000', shadowOffset: { width:0, height:4 }, marginBottom: 20 },
  accentBar: { width: 4, height: 50, borderRadius: 2, position: 'absolute', left: 10 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FAF7F5', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  cardContent: { flex: 1 },
  primaryTitle: { fontSize: 18, fontWeight: '800', color: '#1C1A19' },
  primaryDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  // Section titles
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E3A8A', marginTop: 32, marginBottom: 16 },
  subsectionLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Indicators
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0F4F8', padding: 16, borderRadius: 12, marginBottom: 8 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  indicatorText: { fontSize: 14, color: '#1F2937', fontWeight: '600', flex: 1 },

  // Skin findings
  findingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  findingName: { flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '600' },
  findingConf: { fontSize: 13, color: '#059669', fontWeight: '700' },

  // EfficientNet flags
  flagChip: { alignSelf: 'flex-start', backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 6, marginRight: 6 },
  flagText: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },

  // Structural scores
  structuralGrid: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  structuralItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  structuralLabel: { width: 110, fontSize: 12, color: '#4B5563', fontWeight: '600' },
  scoreBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  scoreValue: { width: 40, fontSize: 12, color: '#1F2937', fontWeight: '700', textAlign: 'right' },

  // Confidence
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 14, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  confidenceLabel: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  confidenceValue: { fontSize: 16, fontWeight: '800', color: '#059669' },

  // LLM Diagnosis
  diagnosisBox: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 18, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 8 },
  diagnosisIcon: { marginTop: 2 },
  diagnosisText: { flex: 1, fontSize: 14, color: '#1E3A8A', lineHeight: 20 },

  // Doctor brief
  briefBox: { backgroundColor: '#F3F4F6', borderRadius: 14, padding: 18, flexDirection: 'row', marginBottom: 12 },
  briefBorder: { width: 3, height: '100%', backgroundColor: '#3B82F6', marginRight: 12 },
  briefText: { flex: 1, fontSize: 13, color: '#4B5563', fontStyle: 'italic', lineHeight: 18 },
  copyBtn: { backgroundColor: '#D1FAE5', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  copyText: { color: '#065F46', fontWeight: '800', fontSize: 14 },

  // RAG Sources
  sourceCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowOpacity: 0.05, shadowRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sourceDisease: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1F2937' },
  sourceCategory: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourceCategoryText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  sourceDesc: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 8 },
  sourceLinks: { gap: 4, marginBottom: 6 },
  sourceLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceLinkLabel: { fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' },
  icdCode: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 4 },

  // Facility
  mapPlaceholder: { height: 180, backgroundColor: '#D1D5DB', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pinBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  facilityFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 20 },
  facilityName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },

  // Misc
  disclaimer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FEF3C7', padding: 10, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  disclaimerText: { fontSize: 10, color: '#92400E', textAlign: 'center' },
  empty: { color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
  debugTrigger: { marginTop: 30, padding: 20 },
  debugTriggerText: { color: '#CCC', fontSize: 10, textAlign: 'center' },
  debugPanel: { marginTop: 10, padding: 16, backgroundColor: '#111', borderRadius: 12 },
  debugLabel: { color: '#FFD700', fontWeight: 'bold', fontSize: 10, marginBottom: 4 },
  debugCode: { color: '#00FF00', fontSize: 11, fontFamily: 'monospace', marginBottom: 6 }
});