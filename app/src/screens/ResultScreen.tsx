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
  KeyboardAvoidingView,
  Platform,
  TextInput
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
import { llmService } from '../llm/LLMService';
import { FacilityService } from '../services/location/FacilityService';

export default function ResultScreen() {
  const route = useRoute<RouteProp<ScanStackParamList, 'Result'>>();
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const params = route.params;

  // -- new contract fields --
  const imageUri: string | undefined = params?.imageUri;
  const analysis: AnalysisResult | undefined = params?.analysis;
  const diagnosis: string | undefined = params?.diagnosis;
  const chunks: DiseaseChunk[] | undefined = params?.chunks;

  // -- legacy fallback: assessment object --
  const [assessment, setAssessment] = useState<any>(params?.result ?? null);
  const [loading, setLoading] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [locatingFacility, setLocatingFacility] = useState(false);
  const [nearestFacility, setNearestFacility] = useState<any>(null);

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

  useEffect(() => {
    setLocatingFacility(true);
    FacilityService.getNearestFacility()
      .then(f => setNearestFacility(f))
      .catch(() => {})
      .finally(() => setLocatingFacility(false));
  }, []);

  const handleNavigateToFacility = () => {
    // open map
  };

  // -- derive display data: prefer new contract, fall back to legacy --
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

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatting) return;
    
    const question = chatInput.trim();
    setChatInput('');
    setIsChatting(true);
    
    const newHistory = [...chatHistory, { role: 'user' as const, text: question }];
    setChatHistory([...newHistory, { role: 'assistant' as const, text: '' }]);
    
    try {
      const textInputStr = assessment?.raw_text ? `\nUser Text Input: ${assessment.raw_text}` : '';
      const voiceInputStr = assessment?.raw_voice ? `\nUser Voice Input: ${assessment.raw_voice}` : '';
      const contextText = `Diagnosis: ${effectiveDiagnosis}\nVisual Indicators: ${effectiveAnalysis?.indicators?.join(', ') || 'None'}\nRAG Matches: ${effectiveChunks.map(c => c.disease).join(', ') || 'None'}${textInputStr}${voiceInputStr}`;
      
      let streamedResponse = '';
      await llmService.runChat(contextText, chatHistory, question, (token) => {
        streamedResponse += token;
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = streamedResponse;
          return updated;
        });
      });
    } catch (e) {
      console.error(e);
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1].text = 'Error generating response offline.';
        return updated;
      });
    } finally {
      setIsChatting(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#1D4ED8" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

              {/* Structural Analysis Bars */}
              <Text style={styles.subsectionLabel}>Structural Assessment</Text>
              <View style={styles.structContainer}>
                {Object.entries(effectiveAnalysis.structural || {}).map(([k, v]) => (
                  <View key={k} style={styles.structRow}>
                    <Text style={styles.structLabel}>
                      {k.replace(/_score/g, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                    <View style={styles.structTrack}>
                      <View style={[styles.structFill, { width: `${(v as number) * 100}%` }]} />
                    </View>
                    <Text style={styles.structValue}>{(v as number).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

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

          {/* 6. SYMPTOMS LIST */}
          {primaryMatch?.matched_symptoms?.length ? (
            <>
              <Text style={styles.sectionTitle}>Matched Symptoms</Text>
              <View style={styles.symptomsBox}>
                {primaryMatch.matched_symptoms.map((sym, i) => (
                  <View key={i} style={styles.symptomItem}>
                    <Icon name="check-circle-outline" size={18} color="#10B981" />
                    <Text style={styles.symptomText}>{sym}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* 7. DOCTOR BRIEF */}
          <Text style={styles.sectionTitle}>Doctor Brief</Text>
          <View style={styles.briefBox}>
            <Text style={styles.briefText}>
              Patient analyzed on {new Date().toLocaleDateString()}.
              {"\n"}Detected condition: {primaryMatch?.disease || effectiveDiagnosis || 'General Analysis'}.
              {primaryMatch?.matched_symptoms?.length ? `\nSymptoms: ${primaryMatch.matched_symptoms.join(', ')}.` : ''}
              {"\n"}Please review for clinical correlation.
            </Text>
            <Pressable style={styles.copyBtn} onPress={handleCopyDoctorBrief}>
              <Icon name="content-copy" size={16} color="#0E5FB3" />
              <Text style={styles.copyBtnText}>Copy Message</Text>
            </Pressable>
          </View>

          {/* 8. RAG CHUNK ATTRIBUTION */}
          {effectiveChunks.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Sources</Text>
              <View style={styles.ragBox}>
                <Text style={styles.ragNotice}>
                  Guidelines drawn from cross-referencing visual and audio indicators against local medical guidelines:
                </Text>
                {effectiveChunks.map((c, i) => (
                  <View key={i} style={styles.ragChunk}>
                    <Icon name="book-open-outline" size={16} color="#4B5563" />
                    <Text style={styles.ragChunkText}>{c.disease}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* 9. NEAREST FACILITY */}
          <Text style={styles.sectionTitle}>Nearest Specialist Facility</Text>
          {locatingFacility ? (
            <View style={styles.facilityLoadingCard}>
              <ActivityIndicator size="small" color="#1D4ED8" />
              <Text style={styles.facilityLoadingText}>Locating nearest specialist offline...</Text>
            </View>
          ) : nearestFacility ? (
            <View style={styles.facilityCard}>
              <View style={styles.facilityHeader}>
                <View style={[styles.facilityIconCircle, nearestFacility.type === 'who' ? styles.iconWho : nearestFacility.type === 'gov' ? styles.iconGov : styles.iconPriv]}>
                  <Icon name={nearestFacility.type === 'who' ? 'earth' : nearestFacility.type === 'gov' ? 'hospital-building' : 'eye-circle'} size={24} color="#FFF" />
                </View>
                <View style={styles.facilityInfo}>
                  <Text style={styles.facilityName}>{nearestFacility.name}</Text>
                  <Text style={styles.facilityType}>
                    {nearestFacility.type === 'who' ? 'WHO Collaborating Centre' : nearestFacility.type === 'gov' ? 'Government Hospital' : 'Private Specialist'}
                  </Text>
                </View>
                {nearestFacility.distanceKm && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{nearestFacility.distanceKm.toFixed(1)} km</Text>
                  </View>
                )}
              </View>
              <Text style={styles.facilityAddress}><Icon name="map-marker-outline" /> {nearestFacility.address}</Text>
              <Text style={styles.facilityDesc}>{nearestFacility.description}</Text>
              
              <Pressable style={styles.navigateBtn} onPress={handleNavigateToFacility}>
                <Icon name="navigation" size={20} color="#FFF" />
                <Text style={styles.navigateBtnText}>Navigate in Maps</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>Could not determine location offline.</Text>
          )}

          {/* 10. FOLLOW-UP CHAT */}
          <Text style={styles.sectionTitle}>Follow-up Questions</Text>
          <View style={styles.chatContainer}>
            {chatHistory.length > 0 ? (
              chatHistory.map((msg, i) => (
                <View key={i} style={[styles.chatBubble, msg.role === 'user' ? styles.chatUser : styles.chatAssistant]}>
                  <Text style={[styles.chatText, msg.role === 'user' ? styles.chatTextUser : styles.chatTextAssistant]}>
                    {msg.text || (isChatting && i === chatHistory.length - 1 ? 'Typing...' : '')}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyChat}>Ask a follow-up question about the diagnosis above.</Text>
            )}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="e.g., What if he starts vomiting?"
                placeholderTextColor="#9CA3AF"
                value={chatInput}
                onChangeText={setChatInput}
                editable={!isChatting}
                multiline
              />
              <Pressable style={styles.chatSendBtn} onPress={handleSendChat} disabled={isChatting || !chatInput.trim()}>
                {isChatting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="send" size={20} color={chatInput.trim() ? "#FFF" : "#93C5FD"} />
                )}
              </Pressable>
            </View>
          </View>

          {/* 11. DEBUG */}
          <Pressable onLongPress={() => setDebugVisible(!debugVisible)} style={styles.debugTrigger}>
            <Text style={styles.debugTriggerText}>Pipeline Version 4.5.1 (Offline Verified)</Text>
          </Pressable>

          {debugVisible && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugLabel}>WHISPER AUDIO TRANSCRIPT:</Text>
              <Text style={styles.debugCode}>{assessment?.raw_voice || 'None'}</Text>
              
              <Text style={styles.debugLabel}>MEDIAPIPE CV OUTPUT:</Text>
              <Text style={styles.debugCode}>{JSON.stringify(effectiveAnalysis, null, 2) || 'None'}</Text>
              
              <Text style={styles.debugLabel}>RAG CHUNKS MATCHED:</Text>
              <Text style={styles.debugCode}>{JSON.stringify(ragResult, null, 2) || 'None'}</Text>

              <Text style={styles.debugLabel}>LLM RAW GENERATION:</Text>
              <Text style={styles.debugCode}>{assessment?.raw_llm_response || JSON.stringify(assessment?.llm_result, null, 2) || 'None'}</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>EarlyEyes is a screening aid, not a medical diagnosis.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },

  riskBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, gap: 12, marginBottom: 24 },
  riskText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, marginTop: 12 },
  subsectionLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginTop: 12, marginBottom: 8 },

  imageCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24, elevation: 3, shadowOpacity: 0.1, shadowRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 } },
  capturedImage: { width: '100%', height: 250, borderRadius: 12, backgroundColor: '#E5E7EB' },

  primaryCard: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, marginBottom: 24 },
  accentBar: { width: 6 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', margin: 16 },
  cardContent: { flex: 1, justifyContent: 'center', paddingRight: 16, paddingVertical: 16 },
  primaryTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  primaryDate: { fontSize: 13, color: '#9CA3AF' },

  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, marginBottom: 8 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  indicatorText: { fontSize: 15, color: '#1E3A8A', fontWeight: '500' },

  findingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  findingName: { flex: 1, fontSize: 15, color: '#374151' },
  findingConf: { fontSize: 13, color: '#10B981', fontWeight: '700' },

  flagChip: { alignSelf: 'flex-start', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 6, borderWidth: 1, borderColor: '#FECACA' },
  flagText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },

  structContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  structRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  structLabel: { width: 100, fontSize: 12, color: '#4B5563', fontWeight: '600' },
  structTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginHorizontal: 12 },
  structFill: { height: 6, backgroundColor: '#3B82F6', borderRadius: 3 },
  structValue: { width: 36, fontSize: 12, color: '#9CA3AF', textAlign: 'right' },

  diagnosisBox: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 18, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 8 },
  diagnosisIcon: { marginTop: 2 },
  diagnosisText: { flex: 1, fontSize: 14, color: '#1E3A8A', lineHeight: 20 },

  symptomsBox: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  symptomItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  symptomText: { fontSize: 15, color: '#065F46', fontWeight: '500' },

  briefBox: { backgroundColor: '#F3F4F6', borderRadius: 14, padding: 18, marginBottom: 12 },
  briefText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E0F2FE', padding: 12, borderRadius: 10 },
  copyBtnText: { color: '#0284C7', fontWeight: '700' },

  ragBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  ragNotice: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  ragChunk: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  ragChunkText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // facility
  facilityLoadingCard: { padding: 24, backgroundColor: '#EFF6FF', borderRadius: 16, alignItems: 'center' },
  facilityLoadingText: { marginTop: 12, color: '#1E3A8A' },
  facilityCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
  facilityHeader: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' },
  facilityIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  iconWho: { backgroundColor: '#3B82F6' },
  iconGov: { backgroundColor: '#10B981' },
  iconPriv: { backgroundColor: '#8B5CF6' },
  facilityInfo: { flex: 1 },
  facilityName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  facilityType: { fontSize: 13, color: '#6B7280' },
  distanceBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  distanceText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  facilityAddress: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  facilityDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 16 },
  navigateBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  navigateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // chat
  chatContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, minHeight: 200 },
  chatBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  chatUser: { alignSelf: 'flex-end', backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  chatAssistant: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  chatText: { fontSize: 14, lineHeight: 20 },
  chatTextUser: { color: '#FFF' },
  chatTextAssistant: { color: '#1F2937' },
  emptyChat: { color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginTop: 40, marginBottom: 40 },
  chatInputRow: { flexDirection: 'row', gap: 8, marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  chatInput: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, minHeight: 40, maxHeight: 100, fontSize: 14, color: '#1F2937' },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },

  disclaimer: { backgroundColor: '#FEF3C7', padding: 10, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  disclaimerText: { fontSize: 10, color: '#92400E', textAlign: 'center' },
  empty: { color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
  debugTrigger: { marginTop: 30, padding: 20 },
  debugTriggerText: { color: '#CCC', fontSize: 10, textAlign: 'center' },
  debugPanel: { marginTop: 10, padding: 16, backgroundColor: '#111', borderRadius: 12 },
  debugLabel: { color: '#FFD700', fontWeight: 'bold', fontSize: 10, marginBottom: 4 },
  debugCode: { color: '#00FF00', fontSize: 11, fontFamily: 'monospace', marginBottom: 6 }
});
