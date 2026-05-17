import { analyzeChildImage } from '../cv/ImageAnalysisService';
import { runRAG } from '../rag/RAGPipeline';
import type { AnalysisResult } from '../cv/ImageAnalysisService';
import type { RAGResult } from '../rag/RAGPipeline';

export interface FinalAssessmentResult {
  id: string;
  timestamp: number;
  image_analysis: AnalysisResult | null;
  rag_result: RAGResult;
  final_risk_level: 'urgent' | 'monitor' | 'ok';
  final_confidence: number;
  input_types_used: ('image' | 'voice' | 'text')[];
  raw_voice: string;
  raw_text: string;
}

export async function runFullAssessment(
  imagePath: string | null,
  voiceTranscript: string | null,
  textInput: string | null
): Promise<FinalAssessmentResult> {
  // 1. Image Analysis
  let imageResult: AnalysisResult | null = null;
  if (imagePath && imagePath.trim().length > 0) {
    try {
      imageResult = await analyzeChildImage(imagePath);
    } catch (e) {
      console.error('[AssessmentPipeline] Image analysis failed:', e);
    }
  }

  // 2. RAG Diagnostic
  const indicators: string[] = imageResult?.indicators ?? [];
  const ragResult = await runRAG(
    indicators, 
    voiceTranscript ?? '', 
    textInput ?? ''
  );

  // 3. Merge Risk Levels
  const riskPriority: Record<string, number> = { urgent: 2, monitor: 1, ok: 0 };
  const imageRisk = imageResult?.risk_level ?? 'ok';
  const final_risk_level = riskPriority[imageRisk] >= riskPriority[ragResult.risk_level]
    ? imageRisk as 'urgent' | 'monitor' | 'ok'
    : ragResult.risk_level;

  // 4. Merge Confidence
  const final_confidence = Math.round(((imageResult?.confidence ?? 0) + ragResult.confidence) / 2);

  // 5. Input Types
  const input_types_used: ('image' | 'voice' | 'text')[] = [];
  if (imagePath) input_types_used.push('image');
  if (voiceTranscript?.trim()) input_types_used.push('voice');
  if (textInput?.trim()) input_types_used.push('text');

  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    image_analysis: imageResult,
    rag_result: ragResult,
    final_risk_level,
    final_confidence,
    input_types_used,
    raw_voice: voiceTranscript ?? '',
    raw_text: textInput ?? ''
  };
}
