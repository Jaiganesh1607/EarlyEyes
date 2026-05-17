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
} from 'react-native';
import { useRoute, type RouteProp, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import type { ScanStackParamList } from '../navigation/AppNavigator';
import type { FinalAssessmentResult } from '../services/pipeline/AssessmentPipeline';
import type { DiseaseMatch } from '../services/rag/RAGPipeline';
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
  const [showDebugCV, setShowDebugCV] = useState(false);
  const [showDebugVoice, setShowDebugVoice] = useState(false);
  const [showDebugRAG, setShowDebugRAG] = useState(false);

  // Load from SQLite if assessmentId provided
  useEffect(() => {
    if (params?.assessmentId && !params?.result) {
      setLoading(true);
      getAssessmentById(params.assessmentId)
        .then((stored) => {
          if (stored) {
            try {
              // Attempt to parse stored JSON if tell_doctor contains serialized FinalAssessmentResult
              const parsed = stored.tell_doctor
                ? (JSON.parse(stored.tell_doctor) as FinalAssessmentResult)
                : null;
              if (parsed && parsed.rag_result) {
                setAssessment(parsed);
              }
            } catch {
              // Not a JSON blob — cannot reconstruct FinalAssessmentResult from legacy data
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [params?.assessmentId, params?.result]);

  const ragResult = assessment?.rag_result ?? null;
  const primaryDisease = ragResult?.primary_disease ?? null;
  const topDiseases = ragResult?.top_diseases ?? [];
  const imageAnalysis = assessment?.image_analysis ?? null;
  const riskLevel = assessment?.final_risk_level ?? ragResult?.risk_level ?? 'ok';

  // Risk banner config
  const riskConfig = useMemo(() => {
    switch (riskLevel) {
      case 'urgent':
        return {
          bg: '#DC2626',
          icon: '⚠️',
          text: t(language, 'risk_urgent'),
        };
      case 'monitor':
        return {
          bg: '#D97706',
          icon: '⚡',
          text: t(language, 'risk_monitor'),
        };
      default:
        return {
          bg: '#16A34A',
          icon: '✓',
          text: t(language, 'risk_ok'),
        };
    }
  }, [riskLevel, language]);

  const handleCopyDoctorBrief = () => {
    const lines: string[] = [];
    lines.push(`${t(language, 'doctor_brief_title')}`);
    if (primaryDisease) {
      lines.push(`Disease: ${primaryDisease.disease}`);
      lines.push(`ICD-11: ${primaryDisease.icd11_code}`);
      if (primaryDisease.matched_symptoms.length > 0) {
        lines.push(`Matched Symptoms: ${primaryDisease.matched_symptoms.join(', ')}`);
      }
      if (primaryDisease.matched_visual.length > 0) {
        lines.push(`Visual Signs: ${primaryDisease.matched_visual.join(', ')}`);
      }
      if (primaryDisease.immediate_actions.length > 0) {
        lines.push(`Actions: ${primaryDisease.immediate_actions.join('; ')}`);
      }
    }
    Clipboard.setString(lines.join('\n'));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main scrollable content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <BrandHeader size={26} />
          <Pressable
            style={styles.closeButton}
            onPress={() =>
              navigation.navigate('InputMethod', {
                photoUri: undefined,
                audioUri: undefined,
              })
            }
            hitSlop={15}
          >
            <Icon name="close" size={28} color="#111827" />
          </Pressable>
        </View>

        {/* 1. Risk Banner */}
        <View style={[styles.riskBanner, { backgroundColor: riskConfig.bg }]}>
          <Text style={styles.riskIcon}>{riskConfig.icon}</Text>
          <Text style={styles.riskText}>{riskConfig.text}</Text>
        </View>

        {/* 2. Possible Conditions */}
        <Text style={styles.sectionTitle}>
          {t(language, 'possible_conditions')}
        </Text>
        {topDiseases.length > 0 ? (
          topDiseases.slice(0, 3).map((disease: DiseaseMatch) => (
            <DiseaseCard key={disease.id} disease={disease} />
          ))
        ) : (
          <Text style={styles.emptyText}>
            {t(language, 'no_conditions_found')}
          </Text>
        )}

        {/* 3. What We Noticed */}
        <Text style={styles.sectionTitle}>
          {t(language, 'what_noticed')}
        </Text>
        {imageAnalysis && imageAnalysis.indicators.length > 0 ? (
          imageAnalysis.indicators.map((indicator: string, idx: number) => (
            <View key={`ind-${idx}`} style={styles.indicatorCard}>
              <Text style={styles.bulletText}>•</Text>
              <Text style={styles.indicatorText}>{indicator}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {t(language, 'no_image_analysis')}
          </Text>
        )}

        {/* 4. What To Do Right Now */}
        <Text style={styles.sectionTitle}>
          {t(language, 'immediate_actions')}
        </Text>
        {primaryDisease ? (
          primaryDisease.immediate_actions.map(
            (action: string, idx: number) => (
              <View key={`act-${idx}`} style={styles.actionRow}>
                <Text style={styles.actionNumber}>{idx + 1}.</Text>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            )
          )
        ) : (
          <Text style={styles.emptyText}>
            {t(language, 'describe_symptoms_prompt')}
          </Text>
        )}

        {/* 5. Warning Signs To Watch */}
        {primaryDisease && primaryDisease.future_warnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t(language, 'future_warnings')}
            </Text>
            {primaryDisease.future_warnings
              .slice(0, 4)
              .map((warning: string, idx: number) => (
                <View key={`warn-${idx}`} style={styles.warningRow}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningText}>{warning}</Text>
                </View>
              ))}
          </>
        )}

        {/* 6. What To Tell The Doctor button */}
        <Pressable
          style={styles.doctorButton}
          onPress={() => setDoctorModalVisible(true)}
        >
          <Icon name="stethoscope" size={20} color="#FFFFFF" />
          <Text style={styles.doctorButtonText}>What To Tell The Doctor</Text>
        </Pressable>

        {/* ═══ DEBUG PANEL ═══ */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugHeader}>🔧 Debug / Raw Outputs</Text>

          {/* ── 1. Image Analysis Pipeline ── */}
          <Pressable
            style={styles.debugToggle}
            onPress={() => setShowDebugCV(!showDebugCV)}
          >
            <Text style={styles.debugToggleText}>
              {showDebugCV ? '▼' : '▶'} Image Analysis Pipeline
            </Text>
          </Pressable>
          {showDebugCV && (
            <View style={styles.debugBlock}>
              {imageAnalysis ? (
                <>
                  <Text style={styles.debugLabel}>Skin Findings:</Text>
                  <Text style={styles.debugJson}>
                    {JSON.stringify(imageAnalysis.skin_findings, null, 2)}
                  </Text>

                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>EfficientNet Flags:</Text>
                  <Text style={styles.debugJson}>
                    {JSON.stringify(imageAnalysis.efficientnet_flags, null, 2)}
                  </Text>

                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>Structural Scores (MediaPipe):</Text>
                  <Text style={styles.debugJson}>
                    {JSON.stringify(imageAnalysis.structural, null, 2)}
                  </Text>

                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>Generated Indicators:</Text>
                  <Text style={styles.debugJson}>
                    {JSON.stringify(imageAnalysis.indicators, null, 2)}
                  </Text>

                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>Risk Level: <Text style={styles.debugHighlight}>{imageAnalysis.risk_level}</Text></Text>
                  <Text style={styles.debugLabel}>Confidence: <Text style={styles.debugHighlight}>{imageAnalysis.confidence}%</Text></Text>
                  {imageAnalysis.analysis_failed && (
                    <Text style={styles.debugError}>⚠ analysis_failed = true</Text>
                  )}
                </>
              ) : (
                <Text style={styles.debugMuted}>No image analysis performed (imagePath was null)</Text>
              )}
            </View>
          )}

          {/* ── 2. Voice-to-Text Translation ── */}
          <Pressable
            style={styles.debugToggle}
            onPress={() => setShowDebugVoice(!showDebugVoice)}
          >
            <Text style={styles.debugToggleText}>
              {showDebugVoice ? '▼' : '▶'} Voice-to-Text (Whisper)
            </Text>
          </Pressable>
          {showDebugVoice && (
            <View style={styles.debugBlock}>
              {assessment?.voice_transcript && assessment.voice_transcript.trim().length > 0 ? (
                <>
                  <Text style={styles.debugLabel}>Raw Transcript:</Text>
                  <Text style={styles.debugTranscript}>"{assessment.voice_transcript}"</Text>
                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>Word Count: <Text style={styles.debugHighlight}>{assessment.voice_transcript.trim().split(/\s+/).length}</Text></Text>
                </>
              ) : (
                <Text style={styles.debugMuted}>No voice transcript available</Text>
              )}
              {assessment?.text_input && assessment.text_input.trim().length > 0 && (
                <>
                  <Text style={[styles.debugLabel, { marginTop: 8 }]}>Text Input:</Text>
                  <Text style={styles.debugTranscript}>"{assessment.text_input}"</Text>
                </>
              )}
            </View>
          )}

          {/* ── 3. RAG Chunking & Scoring ── */}
          <Pressable
            style={styles.debugToggle}
            onPress={() => setShowDebugRAG(!showDebugRAG)}
          >
            <Text style={styles.debugToggleText}>
              {showDebugRAG ? '▼' : '▶'} RAG Chunking & Scoring
            </Text>
          </Pressable>
          {showDebugRAG && assessment?.debug_rag && (
            <View style={styles.debugBlock}>
              <Text style={styles.debugLabel}>Unified Query:</Text>
              <Text style={styles.debugSubLabel}>Visual Terms ({assessment.debug_rag.query.visual_terms.length}):</Text>
              <Text style={styles.debugJson}>
                {JSON.stringify(assessment.debug_rag.query.visual_terms, null, 2)}
              </Text>
              <Text style={styles.debugSubLabel}>Voice Terms ({assessment.debug_rag.query.voice_terms.length}):</Text>
              <Text style={styles.debugJson}>
                {JSON.stringify(assessment.debug_rag.query.voice_terms, null, 2)}
              </Text>
              <Text style={styles.debugSubLabel}>Text Terms ({assessment.debug_rag.query.text_terms.length}):</Text>
              <Text style={styles.debugJson}>
                {JSON.stringify(assessment.debug_rag.query.text_terms, null, 2)}
              </Text>
              <Text style={styles.debugSubLabel}>All Terms (deduplicated) ({assessment.debug_rag.query.all_terms.length}):</Text>
              <Text style={styles.debugJson}>
                {JSON.stringify(assessment.debug_rag.query.all_terms, null, 2)}
              </Text>

              <View style={styles.debugDivider} />

              <Text style={styles.debugLabel}>Scoring Summary:</Text>
              <Text style={styles.debugLabel}>Total Chunks Scanned: <Text style={styles.debugHighlight}>{assessment.debug_rag.total_chunks}</Text></Text>
              <Text style={styles.debugLabel}>Matches (score ≥ 5): <Text style={styles.debugHighlight}>{assessment.debug_rag.all_scored.length}</Text></Text>
              <Text style={styles.debugLabel}>Matched By: <Text style={styles.debugHighlight}>{ragResult?.matched_by ?? 'none'}</Text></Text>
              <Text style={styles.debugLabel}>Risk Level: <Text style={styles.debugHighlight}>{ragResult?.risk_level ?? 'ok'}</Text></Text>

              <View style={styles.debugDivider} />

              <Text style={styles.debugLabel}>All Scored Diseases ({assessment.debug_rag.all_scored.length}):</Text>
              {assessment.debug_rag.all_scored.map((match, idx) => (
                <View key={`debug-match-${idx}`} style={styles.debugScoreRow}>
                  <Text style={styles.debugScoreRank}>#{idx + 1}</Text>
                  <View style={styles.debugScoreInfo}>
                    <Text style={styles.debugScoreName}>{match.disease}</Text>
                    <Text style={styles.debugScoreDetail}>
                      Score: {match.score} | Confidence: {match.confidence_percent}% | ICD-11: {match.icd11_code}
                    </Text>
                    {match.matched_visual.length > 0 && (
                      <Text style={styles.debugScoreDetail}>
                        Visual: {match.matched_visual.join(', ')}
                      </Text>
                    )}
                    {match.matched_symptoms.length > 0 && (
                      <Text style={styles.debugScoreDetail}>
                        Symptoms: {match.matched_symptoms.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* 7. Disclaimer — always at bottom, outside ScrollView */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          {t(language, 'disclaimer')}
        </Text>
      </View>

      {/* Doctor Brief Modal */}
      <Modal
        visible={doctorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDoctorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t(language, 'doctor_brief_title')}
            </Text>

            {primaryDisease ? (
              <>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Disease:</Text>
                  <Text style={styles.modalValue}>
                    {primaryDisease.disease}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>ICD-11:</Text>
                  <Text style={styles.modalValue}>
                    {primaryDisease.icd11_code}
                  </Text>
                </View>

                {primaryDisease.matched_symptoms.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Matched Symptoms:</Text>
                    {primaryDisease.matched_symptoms.map(
                      (s: string, i: number) => (
                        <Text key={`ms-${i}`} style={styles.modalListItem}>
                          • {s}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {primaryDisease.matched_visual.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Visual Signs:</Text>
                    {primaryDisease.matched_visual.map(
                      (v: string, i: number) => (
                        <Text key={`mv-${i}`} style={styles.modalListItem}>
                          • {v}
                        </Text>
                      )
                    )}
                  </View>
                )}

                {primaryDisease.immediate_actions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Immediate Actions:</Text>
                    {primaryDisease.immediate_actions.map(
                      (a: string, i: number) => (
                        <Text key={`ma-${i}`} style={styles.modalListItem}>
                          {i + 1}. {a}
                        </Text>
                      )
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>
                {t(language, 'describe_symptoms_prompt')}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.copyBriefButton}
                onPress={handleCopyDoctorBrief}
              >
                <Icon name="content-copy" size={16} color="#1F2937" />
                <Text style={styles.copyBriefText}>Copy to Clipboard</Text>
              </Pressable>
              <Pressable
                style={styles.closeModalButton}
                onPress={() => setDoctorModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Disease Card Sub-component ────────────────────────────────────── */
function DiseaseCard({ disease }: { disease: DiseaseMatch }) {
  const confidenceColor =
    disease.confidence_percent > 70
      ? '#DC2626'
      : disease.confidence_percent > 40
      ? '#D97706'
      : '#16A34A';

  const matchedSigns = [
    ...disease.matched_visual.slice(0, 3),
    ...disease.matched_symptoms.slice(0, 3),
  ].slice(0, 3);

  return (
    <View style={styles.diseaseCard}>
      <Text style={styles.diseaseName}>{disease.disease}</Text>

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{disease.category}</Text>
      </View>

      {/* Confidence bar */}
      <View style={styles.confidenceTrack}>
        <View
          style={[
            styles.confidenceFill,
            {
              width: `${disease.confidence_percent}%`,
              backgroundColor: confidenceColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.confidenceLabel, { color: confidenceColor }]}>
        {disease.confidence_percent}% match
      </Text>

      {/* Matched signs */}
      {matchedSigns.length > 0 && (
        <Text style={styles.matchedSignsText}>
          Matched signs: {matchedSigns.join(', ')}
        </Text>
      )}
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F3',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 24,
    gap: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },

  /* Risk Banner */
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  riskIcon: {
    fontSize: 18,
  },
  riskText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },

  /* Section */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0E5FB3',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  /* Disease Card */
  diseaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 8,
  },
  diseaseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  confidenceTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 999,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchedSignsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  /* Indicator card */
  indicatorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  bulletText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '700',
  },
  indicatorText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },

  /* Action rows */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E5FB3',
    width: 22,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
  },

  /* Warning rows */
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  /* Doctor button */
  doctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0E5FB3',
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 8,
  },
  doctorButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  /* Disclaimer */
  disclaimerContainer: {
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderTopColor: '#D97706',
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  modalValue: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  modalSection: {
    gap: 4,
    marginTop: 4,
  },
  modalListItem: {
    fontSize: 13,
    color: '#1F2937',
    paddingLeft: 8,
    lineHeight: 20,
  },
  modalButtons: {
    gap: 10,
    marginTop: 8,
  },
  copyBriefButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9BF28D',
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyBriefText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  closeModalButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  closeModalText: {
    fontWeight: '700',
    color: '#6B7280',
    fontSize: 14,
  },

  /* ─── Debug Panel ─────────────────────────────────────────────── */
  debugContainer: {
    marginTop: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  debugHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 6,
  },
  debugToggle: {
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  debugToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#93C5FD',
  },
  debugBlock: {
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 12,
    marginTop: 2,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5B4FC',
    marginBottom: 2,
  },
  debugSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818CF8',
    marginTop: 6,
    marginBottom: 2,
  },
  debugJson: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4ADE80',
    lineHeight: 16,
  },
  debugHighlight: {
    color: '#FDE68A',
    fontWeight: '800',
  },
  debugError: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
    marginTop: 4,
  },
  debugMuted: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  debugTranscript: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#E5E7EB',
    lineHeight: 20,
    backgroundColor: '#1A1A2E',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  debugDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 10,
  },
  debugScoreRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  debugScoreRank: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
    width: 28,
  },
  debugScoreInfo: {
    flex: 1,
    gap: 2,
  },
  debugScoreName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  debugScoreDetail: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});
