import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import { saveAssessment } from '../db/AssessmentRepository';
import { ScanStackParamList } from '../navigation/AppNavigator';
import type { Assessment } from '../types/assessment';
import { analyzeChildImage } from '../services/cv/ImageAnalysisService';
import { useLanguage } from '../i18n';

let initWhisper: any;
try {
  initWhisper = require('whisper.rn').initWhisper;
} catch (e) {
  console.warn("Whisper.rn JS layer not loaded");
}

export default function ProcessingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const route = useRoute();
  const params = route.params as ScanStackParamList['Processing'] | undefined;
  const isProcessing = useRef(false);

  // Dynamically fetch the current Application language (e.g. 'ta', 'hi', 'en', 'es')
  const { language } = useLanguage();

  const [progress, setProgress] = useState(0.65);
  const [stepIndex, setStepIndex] = useState(1);

  const inputLabel = useMemo(() => {
    if (params?.photoUri) {
      return 'photo';
    }
    if (params?.audioUri) {
      return 'audio';
    }
    return 'text';
  }, [params?.audioUri, params?.photoUri]);

  const handleComplete = useCallback(async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    console.log('[Processing] Parallel Pipeline Start');

    const imageTask = params?.photoUri 
      ? analyzeChildImage(params.photoUri).catch(e => ({ analysis_failed: true }))
      : Promise.resolve(null);

    const audioTask = params?.audioUri && initWhisper
      ? (async () => {
          try {
            const whisperContext = await initWhisper({
              filePath: require('../../assets/models/ggml-base-q5_1.bin')
            });
            const { result } = await whisperContext.transcribe(params.audioUri, {
              language: 'auto',
              translate: true,
              beamSize: 1, // FASTEST: Single beam for clinical descriptions
              temperature: 0,
              greedy: true,
              suppressNonSpeechTokens: true,
              prompt: "The child has symptoms like headache, eye pain, redness, or swelling.", // Steering for clinical context
              onProgress: (p: number) => console.log('Whisper:', p)
            }).promise;
            return result;
          } catch (e) {
            console.error("Whisper error", e);
            return "";
          }
        })()
      : Promise.resolve("");

    // RUN BOTH IN PARALLEL
    const [rawCv, transcript] = await Promise.all([imageTask, audioTask]);
    const cvResult = rawCv as any;
    console.log('[Processing] Finished Parallel Execution');

    const timestamp = Date.now();
    const id = `ee-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const input_type = params?.photoUri ? 'photo' : params?.audioUri ? 'audio' : 'text';

    const defaultIndicators = params?.text ? [params.text] : ['Reported symptoms captured.'];
    const mergedAssessment: any = {
      id,
      timestamp,
      risk_level: cvResult?.analysis_failed ? 'monitor' : (cvResult?.risk_level || 'monitor'),
      indicators: cvResult?.indicators?.length ? cvResult.indicators : defaultIndicators,
      skin_findings: cvResult?.skin_findings || [],
      efficientnet_flags: cvResult?.efficientnet_flags || [],
      structural: cvResult?.structural || {
        arm_wasting_score: 0,
        rib_visibility_score: 0,
        limb_symmetry_score: 0,
        facial_wasting_score: 0,
        sunken_eyes_score: 0
      },
      transcript: (transcript as string) || undefined,
      rawOutputs: {
        skin: cvResult?.skin_findings || "No skin findings recorded",
        efficientnet: cvResult?.efficientnet_flags?.length ? cvResult.efficientnet_flags : "No structural flags",
        mediapipe: cvResult?.structural || "No MediaPipe tracking values"
      },
      plain_language: 'Analysis Complete',
      tell_doctor: "Please review the details from my child's visual screening.",
      facility_id: 'Pediatric Eye Center',
      language: 'en',
      input_type,
      confidence: cvResult?.confidence || 78,
    };

    await saveAssessment(mergedAssessment);
    setProgress(1);
    setStepIndex(3);
    setTimeout(() => {
      navigation.navigate('Result', { assessment: mergedAssessment });
    }, 500);

  }, [params, navigation]);

  useEffect(() => {
    void handleComplete();
  }, [handleComplete]);



  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((value) => {
        const next = Math.min(1, value + 0.05);
        if (next >= 0.35) {
          setStepIndex(1);
        }
        if (next >= 0.7) {
          setStepIndex(2);
        }
        if (next >= 0.95) {
          setStepIndex(3);
        }
        return next;
      });
    }, 420);

    return () => clearInterval(interval);
  }, []);

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
          <View style={[styles.stepRow, stepIndex >= 1 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, styles.stepIconComplete]}>
              <Icon name="check" size={16} color="#0F5132" />
            </View>
            <Text style={styles.stepText}>Analyzing {inputLabel}...</Text>
          </View>

          <View style={[styles.stepRow, stepIndex >= 2 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, styles.stepIconCurrent]}>
              <Icon name="timer-sand" size={16} color="#1D4ED8" />
            </View>
            <Text style={[styles.stepText, styles.stepTextEmphasis]}>
              Checking health guidelines...
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepIcon, styles.stepIconIdle]}>
              <Icon name="checkbox-blank-circle-outline" size={16} color="#9CA3AF" />
            </View>
            <Text style={styles.stepTextMuted}>Preparing your result...</Text>
          </View>
        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Estimated wait time</Text>
          <View style={styles.etaValue}>
            <Icon name="timer-outline" size={16} color="#1F2937" />
            <Text style={styles.etaText}>~12 sec</Text>
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
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FB',
    justifyContent: 'space-between',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E5FB3',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0E5FB3',
    borderRadius: 999,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
  },
  stepRowActive: {
    backgroundColor: '#E0EAFF',
    borderWidth: 1,
    borderColor: '#B6CCFF',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  stepIconComplete: {
    backgroundColor: '#D1F3DA',
  },
  stepIconCurrent: {
    backgroundColor: '#DCE7FF',
  },
  stepIconIdle: {
    backgroundColor: '#F3F4F6',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepTextEmphasis: {
    color: '#1D4ED8',
  },
  stepTextMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3EEEC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  etaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  etaValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    paddingVertical: 14,
    marginTop: 18,
    backgroundColor: '#F7F7F8',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
});
