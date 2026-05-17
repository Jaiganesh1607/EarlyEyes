import { analyzeChildImage } from '../cv/ImageAnalysisService';
import { runRAG } from '../rag/RAGPipeline';
import { getChunks } from '../rag/ChunkLoader';
import { buildQuery } from '../rag/QueryBuilder';
import { scoreDiseases } from '../rag/DiseaseScorer';
import type { AnalysisResult } from '../cv/ImageAnalysisService';
import type { RAGResult } from '../rag/RAGPipeline';
import type { UnifiedQuery } from '../rag/QueryBuilder';
import type { DiseaseMatch } from '../rag/DiseaseScorer';

export type { AnalysisResult, RAGResult, UnifiedQuery, DiseaseMatch };

export interface DebugRAG {
  query: UnifiedQuery;
  all_scored: DiseaseMatch[];
  total_chunks: number;
}

export interface FinalAssessmentResult {
  id: string;
  timestamp: number;
  image_analysis: AnalysisResult | null;
  rag_result: RAGResult;
  final_risk_level: 'urgent' | 'monitor' | 'ok';
  final_confidence: number;
  input_types_used: ('image' | 'voice' | 'text')[];
  voice_transcript: string;
  text_input: string;
  debug_rag: DebugRAG;
}

const RISK_PRIORITY: Record<string, number> = {
  urgent: 3,
  monitor: 2,
  ok: 1,
};

function higherRisk(
  a: 'urgent' | 'monitor' | 'ok' | undefined,
  b: 'urgent' | 'monitor' | 'ok'
): 'urgent' | 'monitor' | 'ok' {
  const aPriority = RISK_PRIORITY[a ?? 'ok'] ?? 1;
  const bPriority = RISK_PRIORITY[b] ?? 1;
  return aPriority >= bPriority ? (a ?? 'ok') : b;
}

export async function runFullAssessment(
  imagePath: string | null,
  voiceTranscript: string | null,
  textInput: string | null
): Promise<FinalAssessmentResult> {
  // Step 1: Run CV analysis if image provided
  let imageResult: AnalysisResult | null = null;
  if (imagePath) {
    try {
      imageResult = await analyzeChildImage(imagePath);
    } catch (e) {
      // If analysis fails, imageResult stays null
      console.warn('[AssessmentPipeline] Image analysis failed:', e);
    }
  }

  // Step 2: Extract indicators from CV result
  const indicators: string[] = imageResult?.indicators ?? [];

  // Step 3: Run RAG pipeline
  const ragResult = await runRAG(
    indicators,
    voiceTranscript ?? '',
    textInput ?? ''
  );

  // Step 4: Merge risk levels — take the highest
  const final_risk_level = higherRisk(
    imageResult?.risk_level,
    ragResult.risk_level
  );

  // Step 5: Average confidence
  const imageConfidence = imageResult?.confidence ?? 0;
  const ragConfidence = ragResult.confidence;
  const final_confidence = Math.round((imageConfidence + ragConfidence) / 2);

  // Step 6: Determine input types used
  const input_types_used: ('image' | 'voice' | 'text')[] = [];
  if (imagePath) {
    input_types_used.push('image');
  }
  if (voiceTranscript && voiceTranscript.trim().length > 0) {
    input_types_used.push('voice');
  }
  if (textInput && textInput.trim().length > 0) {
    input_types_used.push('text');
  }

  // Step 7: Build debug RAG info
  const chunks = getChunks();
  const debugQuery = buildQuery(
    indicators,
    voiceTranscript ?? '',
    textInput ?? ''
  );
  const allScored = scoreDiseases(chunks, debugQuery);

  const debug_rag: DebugRAG = {
    query: debugQuery,
    all_scored: allScored,
    total_chunks: chunks.length,
  };

  // Step 8: Build result
  const now = Date.now();
  return {
    id: now.toString(),
    timestamp: now,
    image_analysis: imageResult,
    rag_result: ragResult,
    final_risk_level,
    final_confidence,
    input_types_used,
    voice_transcript: voiceTranscript ?? '',
    text_input: textInput ?? '',
    debug_rag,
  };
}
