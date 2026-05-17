import { getChunks } from './ChunkLoader';
import { buildQuery } from './QueryBuilder';
import { scoreDiseases } from './DiseaseScorer';
import type { DiseaseMatch } from './DiseaseScorer';

export type { DiseaseMatch };

export interface RAGResult {
  top_diseases: DiseaseMatch[];
  primary_disease: DiseaseMatch | null;
  risk_level: 'urgent' | 'monitor' | 'ok';
  confidence: number;
  matched_by: 'image' | 'voice' | 'text' | 'combined' | 'none';
}

const URGENT_KEYWORDS = [
  "death",
  "shock",
  "organ failure",
  "fatality",
  "life-threatening",
  "mortality",
];

export async function runRAG(
  imageIndicators: string[],
  voiceTranscript: string,
  textInput: string
): Promise<RAGResult> {
  const chunks = getChunks();
  const query = buildQuery(imageIndicators, voiceTranscript, textInput);
  const allMatches = scoreDiseases(chunks, query);

  const top_diseases = allMatches.slice(0, 3);
  const primary_disease = top_diseases.length > 0 ? top_diseases[0] : null;

  // Determine matched_by
  const hasImage = imageIndicators.length > 0;
  const hasVoice = voiceTranscript.trim().length > 0;
  const hasText = textInput.trim().length > 0;

  let matched_by: RAGResult['matched_by'];
  if (hasImage && (hasVoice || hasText)) {
    matched_by = 'combined';
  } else if (hasImage) {
    matched_by = 'image';
  } else if (hasVoice) {
    matched_by = 'voice';
  } else if (hasText) {
    matched_by = 'text';
  } else {
    matched_by = 'none';
  }

  // Determine risk_level
  let risk_level: RAGResult['risk_level'] = 'ok';

  if (top_diseases.length > 0) {
    risk_level = 'monitor';
  }

  if (primary_disease) {
    const hasUrgentWarning = primary_disease.future_warnings.some((w) =>
      URGENT_KEYWORDS.some((kw) => w.toLowerCase().includes(kw))
    );
    if (hasUrgentWarning || primary_disease.score > 30) {
      risk_level = 'urgent';
    }
  }

  const confidence = primary_disease?.confidence_percent ?? 0;

  return {
    top_diseases,
    primary_disease,
    risk_level,
    confidence,
    matched_by,
  };
}
