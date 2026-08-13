// ============================================================
// ExampleDiagnosisScreen.tsx
// Drop this anywhere in your screens/ folder as a usage reference.
// This is NOT required — it's just a working example.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLLM, LLMInput, DiseaseResult } from './index';

// ── Replace this with your actual RAG retrieval function ───────────────────
const fetchRAGContent = async (symptoms: string): Promise<string> => {
  // TODO: call your vector DB / retrieval pipeline here.
  // For now return placeholder so you can test the LLM path.
  return `Relevant reference content for: ${symptoms}
  
Common pediatric malnutrition types:
- Severe Acute Malnutrition (Marasmus): extreme wasting, MUAC < 11.5 cm
- Kwashiorkor: protein deficiency with edema
- MAM: Moderate Acute Malnutrition, MUAC 11.5–12.5 cm`;
};
// ──────────────────────────────────────────────────────────────────────────

const ExampleDiagnosisScreen: React.FC = () => {
  const [symptoms, setSymptoms] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childWeight, setChildWeight] = useState('');

  const { status, downloadProgress, error, result, isRunning, initialize, diagnose } =
    useLLM({
      // modelUrl: 'https://...custom-url...',  // optional override
      autoInit: false,
    });

  const handleInitialize = async () => {
    await initialize();
  };

  const handleDiagnose = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Please enter symptoms first.');
      return;
    }

    const ragContent = await fetchRAGContent(symptoms);

    const input: LLMInput = {
      symptoms,
      ragContent,
      childAge: childAge || undefined,
      childWeight: childWeight || undefined,
    };

    await diagnose(input);
  };

  const renderStatusBadge = () => {
    const colors: Record<string, string> = {
      not_downloaded: '#888',
      downloading: '#f90',
      downloaded: '#0af',
      loading: '#fa0',
      ready: '#0c0',
      error: '#c00',
    };
    return (
      <View style={[styles.badge, { backgroundColor: colors[status] }]}>
        <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const renderResult = (item: DiseaseResult) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.diseaseName}>{item.disease}</Text>
      <Text style={styles.icd}>ICD-11: {item.icd11_code}</Text>
      <Text style={styles.description}>{item.description}</Text>

      <Text style={styles.sectionTitle}>Symptoms</Text>
      {item.symptoms.map((s, i) => (
        <Text key={i} style={styles.bullet}>• {s}</Text>
      ))}

      <Text style={styles.sectionTitle}>Immediate Actions</Text>
      {item.immediate_actions.map((a, i) => (
        <Text key={i} style={styles.bullet}>→ {a}</Text>
      ))}

      <Text style={styles.sectionTitle}>Future Warnings</Text>
      {item.future_warnings.map((w, i) => (
        <Text key={i} style={styles.bullet}>⚠ {w}</Text>
      ))}

      <Text style={styles.meta}>
        Sources: {item.metadata.sourceLabel}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Pediatric Nutrition AI</Text>

      {renderStatusBadge()}

      {/* ── Download progress ── */}
      {status === 'downloading' && downloadProgress && (
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBar,
              { width: `${downloadProgress.percentage}%` },
            ]}
          />
          <Text style={styles.progressText}>
            Downloading model... {downloadProgress.percentage}%
            {' '}({Math.round(downloadProgress.bytesDownloaded / 1_000_000)} MB
            / {Math.round(downloadProgress.totalBytes / 1_000_000)} MB)
          </Text>
        </View>
      )}

      {/* ── Error ── */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* ── Init button ── */}
      {status !== 'ready' && status !== 'downloading' && status !== 'loading' && (
        <TouchableOpacity style={styles.button} onPress={handleInitialize}>
          <Text style={styles.buttonText}>Download & Load Model</Text>
        </TouchableOpacity>
      )}

      {status === 'loading' && (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.loadingText}> Loading model into memory…</Text>
        </View>
      )}

      {/* ── Inputs ── */}
      {status === 'ready' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Describe symptoms (e.g. very thin, ribs visible, weak…)"
            multiline
            value={symptoms}
            onChangeText={setSymptoms}
          />
          <TextInput
            style={styles.input}
            placeholder="Child age (e.g. 8 months)"
            value={childAge}
            onChangeText={setChildAge}
          />
          <TextInput
            style={styles.input}
            placeholder="Child weight (e.g. 5.2 kg)"
            value={childWeight}
            onChangeText={setChildWeight}
          />

          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={handleDiagnose}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Run Diagnosis</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── Results ── */}
      {result && result.results.length > 0 && (
        <>
          <Text style={styles.resultsTitle}>
            {result.results.length} condition(s) identified
          </Text>
          {result.results.map(renderResult)}
        </>
      )}

      {result && result.results.length === 0 && (
        <Text style={styles.noResults}>
          No matching conditions found. Check symptoms and RAG content.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  progressRow: { marginBottom: 12 },
  progressBar: {
    height: 6,
    backgroundColor: '#0af',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressText: { fontSize: 12, color: '#555' },
  error: { color: '#c00', marginBottom: 12 },
  button: {
    backgroundColor: '#1a73e8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  loadingText: { color: '#555' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  diseaseName: { fontSize: 17, fontWeight: '700', color: '#c00', marginBottom: 2 },
  icd: { fontSize: 12, color: '#888', marginBottom: 8 },
  description: { fontSize: 13, color: '#333', marginBottom: 10, lineHeight: 20 },
  sectionTitle: { fontWeight: '700', marginTop: 8, marginBottom: 4, color: '#555' },
  bullet: { fontSize: 13, color: '#333', marginBottom: 2, paddingLeft: 4 },
  meta: { fontSize: 11, color: '#aaa', marginTop: 10 },
  noResults: { textAlign: 'center', color: '#888', marginTop: 20 },
});

export default ExampleDiagnosisScreen;