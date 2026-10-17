import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import { saveAssessment } from '../db/AssessmentRepository';
import { ScanStackParamList } from '../navigation/AppNavigator';
import { analyzeChildImage } from '../services/cv/ImageAnalysisService';
import { useLanguage } from '../i18n';
import { runRAG } from '../services/rag/RAGPipeline';
import { llmService } from '../llm/LLMService';
import RNFS from 'react-native-fs';

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
  const [llmText, setLlmText] = useState<string>('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (stepIndex > 0 && stepIndex < 4) {
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
          const whisperPath = `${RNFS.DocumentDirectoryPath}/ggml-base-q5_1.bin`;
          const isWhisperDownloaded = await RNFS.exists(whisperPath);
          
          if (!isWhisperDownloaded) {
            setStatusMessage('Loading offline Whisper model...');
            await RNFS.copyFileAssets('models/ggml-base-q5_1.bin', whisperPath);
          }
          
          const whisperContext = await initWhisper({ filePath: whisperPath });
          const isEnglish = language === 'en';
          
          const transcribeResult = await whisperContext.transcribe(params.audioUri, {
            language: language || 'en', 
            translate: !isEnglish, 
            beamSize: 1,
            temperature: 0, 
            greedy: true, 
            suppressNonSpeechTokens: true,
            suppressBlank: true,
            prompt: "Clinical symptoms.",
            onProgress: (p: number) => {
              setProgress(0.2 + (p / 100) * 0.3); // max 0.5 for this step
              setStatusMessage(`Transcribing audio: ${p}%`);
            }
          }).promise;
          
          let text = transcribeResult.result;
          const lowerText = text.toLowerCase();
          
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
    
    setProgress(0.6);
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
    
    setProgress(0.7);
    setStepIndex(3);
    // 3. LLM GENERATION
    const tLlm = Date.now();
    let llmFinalResult = null;
    let llmOutput: any = null;
    let llmTime = 0;
    
    const hasSymptoms = (cvResult?.indicators && cvResult.indicators.length > 0) || (transcript && transcript.trim().length > 0) || (params?.text && params.text.trim().length > 0);

    if (!hasSymptoms) {
      setStatusMessage('Healthy patient: Skipping LLM...');
      setLlmText('⚡ Healthy patient detected.\n\nBypassing the LLM reasoning engine because no symptoms were provided.');
      await new Promise(r => setTimeout(r, 800)); // Brief UX pause
    } else if (params?.analysisMode === 'fast') {
      setStatusMessage('Fast Mode: Skipping LLM...');
      setLlmText('⚡ Fast Mode selected.\n\nBypassing the LLM reasoning engine to provide instant offline results using the RAG medical database.');
      await new Promise(r => setTimeout(r, 800)); // Brief UX pause
    } else {
      setStatusMessage('LLM Generating Final Diagnosis...');
      try {
        if (llmService.status !== 'ready') {
          setStatusMessage('Loading LLM Model...');
          await llmService.initialize((p) => {
             setStatusMessage(`Downloading LLM: ${Math.round(p.percentage)}%`);
          });
        }
        
        const ragContent = ragResult.raw_chunks?.join('\n\n') || "";
        const symptoms = `Visual indicators: ${(cvResult?.indicators || []).join(', ')}. Transcript: ${transcript} ${params?.text || ''}`;
        
        setStatusMessage('Analyzing with Llama 3.2...');
        
        let dots = "";
        llmOutput = await llmService.runDiagnosis(
          { symptoms, ragContent },
          (token) => {
            dots = dots.length > 5 ? "" : dots + ".";
            setLlmText('Llama 3.2 is analyzing clinical data' + dots + '\n\nPlease wait, this may take a moment.');
          }
        );
        
        llmFinalResult = llmOutput.results[0]; // Take top result if valid JSON array
        llmTime = Date.now() - tLlm;
      } catch (e) {
        console.error("LLM Error:", e);
        // Fallback to rule-based is implicit because we still have ragResult
      }
    }
    
    const totalTime = Date.now() - t0;
    const timingStr = `CV: ${(cvData.time/1000).toFixed(1)}s | Audio: ${(audioData.time/1000).toFixed(1)}s | RAG: ${(ragTime/1000).toFixed(1)}s | LLM: ${(llmTime/1000).toFixed(1)}s`;
    console.log(`[Pipeline Performance] ${timingStr}`);
    setMetrics(timingStr);

    setStatusMessage('Finalizing Assessment...');
    setProgress(1.0);
    setStepIndex(4);

    const id = `ee-${t0}-${Math.random().toString(36).slice(2, 8)}`;
    const input_type = params?.photoUri ? 'photo' : params?.audioUri ? 'audio' : 'text';

    const input_types_used = [];
    if (params?.photoUri) input_types_used.push('image');
    if (transcript) input_types_used.push('voice');
    if (params?.text) input_types_used.push('text');

    // Use LLM result if available, otherwise fallback to RAG rule-based result
    const final_risk_level = llmFinalResult?.risk_level || ragResult.risk_level;
    const cappedCvConf = Math.min(cvResult?.confidence || 0, 100);
    const calculated_confidence = Math.round((cappedCvConf + ragResult.confidence) / 2);
    const final_confidence = llmFinalResult?.confidence_percent || calculated_confidence;

    const mergedAssessment: any = {
      // Required by DB Assessment Type
      id,
      timestamp: t0,
      risk_level: final_risk_level,
      indicators: cvResult?.indicators || [],
      confidence: final_confidence,
      tell_doctor: JSON.stringify({
        final_risk_level: final_risk_level,
        rag_result: ragResult,
        llm_result: llmFinalResult,
        raw_llm_response: llmOutput?.rawResponse,
        image_analysis: cvResult,
        raw_voice: transcript,
        raw_text: params?.text,
        diagnosis: llmFinalResult?.reasoning || llmFinalResult?.disease || ragResult?.primary_disease?.disease || ""
      }),
      facility_id: 'Pediatric specialist',
      input_type,
      language: 'en',
      diagnosis: llmFinalResult?.reasoning || llmFinalResult?.disease || ragResult?.primary_disease?.disease || "",
      
      // Required by ResultScreen FinalAssessmentResult Type
      final_risk_level: final_risk_level,
      final_confidence: final_confidence,
      rag_result: ragResult,
      llm_result: llmFinalResult,
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
    }, 1500); // Give user time to see final streamed output before navigating
  }, [params, navigation, language]);

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

          {/* Step 3: LLM Phase */}
          <View style={[styles.stepRow, stepIndex >= 3 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, stepIndex > 3 ? styles.stepIconComplete : stepIndex === 3 ? styles.stepIconCurrent : styles.stepIconIdle]}>
              <Icon name={stepIndex > 3 ? "check" : stepIndex === 3 ? "robot-outline" : "checkbox-blank-circle-outline"} size={16} color={stepIndex > 3 ? "#0F5132" : stepIndex === 3 ? "#1D4ED8" : "#9CA3AF"} />
            </View>
            <Text style={[styles.stepText, stepIndex === 3 && styles.stepTextEmphasis]}>
              {stepIndex === 3 ? statusMessage : (stepIndex > 3 ? 'LLM Output Generated' : 'Waiting for LLM...')}
            </Text>
          </View>
        </View>

        {stepIndex >= 3 && (
          <ScrollView style={styles.llmStreamBox}>
            <Text style={styles.llmStreamText}>
              {llmText.length > 0 ? llmText : "Loading Llama 3.2 Engine...\n\nInitializing weight layers..."}
            </Text>
          </ScrollView>
        )}

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
  llmStreamBox: { maxHeight: 120, padding: 10, backgroundColor: '#1E293B', borderRadius: 8, marginTop: 4 },
  llmStreamText: { color: '#38BDF8', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 24, borderWidth: 2, borderColor: '#9CA3AF', paddingVertical: 14, marginTop: 18, backgroundColor: '#F7F7F8' },
  cancelText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  metricsBox: { marginTop: 4, padding: 12, backgroundColor: '#111', borderRadius: 8 },
  metricsHeader: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  metricsText: { color: '#0F0', fontFamily: 'monospace', fontSize: 11 },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3EEEC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  etaLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  etaValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaText: { fontSize: 16, fontWeight: '700', color: '#111827' }
});
