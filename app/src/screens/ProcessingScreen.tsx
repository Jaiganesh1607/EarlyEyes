import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import { saveAssessment } from '../db/AssessmentRepository';
import { ScanStackParamList } from '../navigation/AppNavigator';
import { analyzeChildImage } from '../services/cv/ImageAnalysisService';
import { useLanguage } from '../i18n';
import { runRAG } from '../services/rag/RAGPipeline';

let initWhisper: any;
try {
  initWhisper = require('whisper.rn').initWhisper;
} catch (e) {
  console.warn("Whisper.rn JS layer not loaded");
}

export default function ProcessingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const route = useRoute();
  const params = route.params as ScanStackParamList['Processing'] | undefined;
  const isProcessing = useRef(false);
  const { language } = useLanguage();

  const [progress, setProgress] = useState(0.1);
  const [stepIndex, setStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing AI Pipeline...');
  const [metrics, setMetrics] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (stepIndex > 0 && stepIndex < 3) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stepIndex]);

  const inputLabel = useMemo(() => {
    if (params?.photoUri && params?.audioUri) return 'photo and audio';
    if (params?.photoUri) return 'photo';
    if (params?.audioUri) return 'audio';
    return 'text';
  }, [params?.audioUri, params?.photoUri]);

  const handleComplete = useCallback(async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
    const t0 = Date.now();
    setStatusMessage(`Starting parallel analysis for ${inputLabel}...`);
    setStepIndex(1);

    // 1. Parallel Task Setup
    const cvTask = (async () => {
      const start = Date.now();
      let res: any = null;
      if (params?.photoUri) {
        console.log('[Pipeline] Phase 1: CV Started');
        res = await analyzeChildImage(params.photoUri).catch(() => ({ analysis_failed: true }));
      }
      return { res, time: Date.now() - start };
    })();

    const audioTask = (async () => {
      const start = Date.now();
      let res = '';
      if (params?.audioUri && initWhisper) {
        console.log('[Pipeline] Phase 2: Whisper Started');
        try {
          const whisperContext = await initWhisper({ filePath: require('../../assets/models/ggml-base-q5_1.bin') });
          
          const isEnglish = language === 'en';
          
          const transcribeResult = await whisperContext.transcribe(params.audioUri, {
            // Use the app's selected UI language to skip the slow 30-second auto-detect phase
            language: language || 'en', 
            // Only run the heavy translation pass if the language is NOT English
            translate: !isEnglish, 
            beamSize: 1, // Beam size 1 is strictly greedy, which is the fastest setting
            temperature: 0, 
            greedy: true, 
            suppressNonSpeechTokens: true,
            suppressBlank: true,
            prompt: "Clinical symptoms.",
            onProgress: (p: number) => {
              setProgress(0.2 + (p / 100) * 0.5);
              setStatusMessage(`Transcribing audio: ${p}%`);
            }
          }).promise;
          
          let text = transcribeResult.result;
          const lowerText = text.toLowerCase();
          
          // Aggressively filter out known Whisper silence hallucinations
          const isHallucination = 
            lowerText.includes("going to the road") || 
            lowerText.includes("doing something wrong") || 
            lowerText.includes("habit of walking") ||
            lowerText.includes("thank you") ||
            lowerText.includes("thanks for watching");
            
          if (isHallucination || text.trim().length < 5) {
            text = "";
          }
          res = text;
        } catch (e) { res = ""; }
      }
      return { res, time: Date.now() - start };
    })();

    // RUN BOTH IN PARALLEL
    const [cvData, audioData] = await Promise.all([cvTask, audioTask]);
    const cvResult = cvData.res;
    const transcript = audioData.res;
    
    setProgress(0.8);
    setStepIndex(2);
    setStatusMessage('Cross-referencing RAG Knowledge Base...');

    // 2. RAG ANALYSIS
    const tRag = Date.now();
    const ragResult = await runRAG(
      cvResult?.indicators || [],
      transcript as string,
      params?.text || ""
    );
    const ragTime = Date.now() - tRag;

    const totalTime = Date.now() - t0;
    const timingStr = `CV: ${(cvData.time/1000).toFixed(1)}s | Audio: ${(audioData.time/1000).toFixed(1)}s | RAG: ${(ragTime/1000).toFixed(1)}s | Total: ${(totalTime/1000).toFixed(1)}s`;
    console.log(`[Pipeline Performance] ${timingStr}`);
    setMetrics(timingStr);

    setStatusMessage('Finalizing Assessment...');
    setProgress(1.0);
    setStepIndex(3);

    const id = `ee-${t0}-${Math.random().toString(36).slice(2, 8)}`;
    const input_type = params?.photoUri ? 'photo' : params?.audioUri ? 'audio' : 'text';

    const input_types_used = [];
    if (params?.photoUri) input_types_used.push('image');
    if (transcript) input_types_used.push('voice');
    if (params?.text) input_types_used.push('text');

    const mergedAssessment: any = {
      // Required by DB Assessment Type
      id,
      timestamp: t0,
      risk_level: ragResult.risk_level,
      indicators: cvResult?.indicators || [],
      confidence: Math.round(((cvResult?.confidence ?? 0) + ragResult.confidence) / 2),
      tell_doctor: JSON.stringify({
        final_risk_level: ragResult.risk_level,
        rag_result: ragResult,
        image_analysis: cvResult,
        raw_voice: transcript,
        raw_text: params?.text
      }),
      facility_id: 'Pediatric specialist',
      input_type,
      language: 'en',
      
      // Required by ResultScreen FinalAssessmentResult Type
      final_risk_level: ragResult.risk_level,
      final_confidence: Math.round(((cvResult?.confidence ?? 0) + ragResult.confidence) / 2),
      rag_result: ragResult,
      image_analysis: cvResult ? {
        risk_level: cvResult.risk_level,
        indicators: cvResult.indicators || [],
        skin_findings: cvResult.skin_findings || [],
        efficientnet_flags: cvResult.efficientnet_flags || [],
        structural: cvResult.structural || {},
        confidence: cvResult.confidence || 0,
        analysis_failed: false
      } : null,
      raw_voice: transcript,
      raw_text: params?.text || "",
      input_types_used
    };

    try {
      await saveAssessment(mergedAssessment);
    } catch (e) {
      console.warn("Failed to save assessment to SQLite:", e);
    }
    
    setTimeout(() => { 
      navigation.navigate('Result', { assessmentId: id, result: mergedAssessment }); 
    }, 1000); // Small delay to let user see "100%"
  }, [params, navigation]);

  useEffect(() => {
    void handleComplete();
  }, [handleComplete]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandBlock}>
        <BrandHeader layout="stack" size={72} subtitle="Analysis in Progress" />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>SCANNING</Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.stepList}>
          {/* Step 1: Initialize/Parallel Task */}
          <View style={[styles.stepRow, stepIndex >= 1 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, stepIndex > 1 ? styles.stepIconComplete : stepIndex === 1 ? styles.stepIconCurrent : styles.stepIconIdle]}>
              <Icon name={stepIndex > 1 ? "check" : "timer-sand"} size={16} color={stepIndex > 1 ? "#0F5132" : stepIndex === 1 ? "#1D4ED8" : "#9CA3AF"} />
            </View>
            <Text style={[styles.stepText, stepIndex === 1 && styles.stepTextEmphasis]}>
              {stepIndex === 1 ? statusMessage : `Analyzed ${inputLabel}`}
            </Text>
          </View>

          {/* Step 2: RAG Phase */}
          <View style={[styles.stepRow, stepIndex >= 2 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, stepIndex > 2 ? styles.stepIconComplete : stepIndex === 2 ? styles.stepIconCurrent : styles.stepIconIdle]}>
              <Icon name={stepIndex > 2 ? "check" : stepIndex === 2 ? "brain" : "checkbox-blank-circle-outline"} size={16} color={stepIndex > 2 ? "#0F5132" : stepIndex === 2 ? "#1D4ED8" : "#9CA3AF"} />
            </View>
            <Text style={[styles.stepText, stepIndex === 2 && styles.stepTextEmphasis]}>
              {stepIndex === 2 ? statusMessage : (stepIndex > 2 ? 'Cross-referenced clinical data' : 'Checking health guidelines...')}
            </Text>
          </View>

          {/* Step 3: Complete */}
          <View style={[styles.stepRow, stepIndex >= 3 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, stepIndex >= 3 ? styles.stepIconComplete : styles.stepIconIdle]}>
              <Icon name={stepIndex >= 3 ? "check" : "checkbox-blank-circle-outline"} size={16} color={stepIndex >= 3 ? "#0F5132" : "#9CA3AF"} />
            </View>
            <Text style={stepIndex >= 3 ? styles.stepText : styles.stepTextMuted}>
              {stepIndex >= 3 ? 'Finalizing Assessment...' : 'Preparing your result...'}
            </Text>
          </View>
        </View>

        <View style={styles.metricsBox}>
          <Text style={styles.metricsHeader}>Pipeline Latency Metrics:</Text>
          <Text style={styles.metricsText}>{metrics || "Measuring..."}</Text>
        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Time Elapsed</Text>
          <View style={styles.etaValue}>
            <Icon name="timer-outline" size={16} color="#1F2937" />
            <Text style={styles.etaText}>{elapsedTime}s</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Icon name="close" size={18} color="#374151" />
        <Text style={styles.cancelText}>Cancel Scan</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F5F7FB', justifyContent: 'space-between' },
  brandBlock: { alignItems: 'center', gap: 10, marginTop: 6 },
  progressCard: { borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', padding: 18, gap: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 13, fontWeight: '800', color: '#0E5FB3', letterSpacing: 1 },
  progressPercent: { fontSize: 16, fontWeight: '700', color: '#374151' },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0E5FB3', borderRadius: 999 },
  stepList: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#F9FAFB' },
  stepRowActive: { backgroundColor: '#E0EAFF', borderWidth: 1, borderColor: '#B6CCFF' },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  stepIconComplete: { backgroundColor: '#D1F3DA' },
  stepIconCurrent: { backgroundColor: '#DCE7FF' },
  stepIconIdle: { backgroundColor: '#F3F4F6' },
  stepText: { fontSize: 14, fontWeight: '600', color: '#1F2937', flex: 1 },
  stepTextEmphasis: { color: '#1D4ED8' },
  stepTextMuted: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 24, borderWidth: 2, borderColor: '#9CA3AF', paddingVertical: 14, marginTop: 18, backgroundColor: '#F7F7F8' },
  cancelText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  metricsBox: { marginTop: 10, padding: 12, backgroundColor: '#111', borderRadius: 8 },
  metricsHeader: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  metricsText: { color: '#0F0', fontFamily: 'monospace', fontSize: 11 },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3EEEC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  etaLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  etaValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaText: { fontSize: 16, fontWeight: '700', color: '#111827' }
});
