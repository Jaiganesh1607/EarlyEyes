import { getChunks } from './ChunkLoader';
import { buildQuery } from './QueryBuilder';
import { scoreDiseases, DiseaseMatch } from './DiseaseScorer';

export interface RAGResult {
  top_diseases: DiseaseMatch[];
  primary_disease: DiseaseMatch | null;
  risk_level: 'urgent' | 'monitor' | 'ok';
  confidence: number;
  matched_by: 'image' | 'voice' | 'text' | 'combined' | 'none';
  total_matched: number;
}

const URGENT_KEYWORDS = [
  "death", "shock", "organ failure", "fatality", "life-threatening",
  "mortality", "emergency", "coma", "airway obstruction", "cardiac failure",
  "respiratory failure", "septic shock", "kernicterus", "cerebral malaria",
  "within hours", "without treatment", "surgical emergency"
];

export async function runRAG(
  imageIndicators: string[],
  voiceTranscript: string,
  textInput: string
): Promise<RAGResult> {
  const chunks = getChunks();
  const query = buildQuery(imageIndicators, voiceTranscript, textInput);
  const scored = scoreDiseases(chunks, query);
  
  const top_diseases = scored.slice(0, 3);
  const primary_disease = top_diseases[0] ?? null;

  const hasImage = imageIndicators.length > 0;
  const hasVoice = voiceTranscript.trim().length > 0;
  const hasText = textInput.trim().length > 0;

  const matched_by =
    (hasImage && (hasVoice || hasText)) ? 'combined' :
    hasImage ? 'image' :
    hasVoice ? 'voice' :
    hasText ? 'text' : 'none';

  const isUrgent = primary_disease !== null && (
    primary_disease.score > 30 ||
    primary_disease.future_warnings.some(w =>
      URGENT_KEYWORDS.some(kw => w.toLowerCase().includes(kw))
    )
  );

  const risk_level = isUrgent ? 'urgent' :
    top_diseases.length > 0 ? 'monitor' : 'ok';

  return {
    top_diseases,
    primary_disease,
    risk_level,
    confidence: primary_disease?.confidence_percent ?? 0,
    matched_by,
    total_matched: scored.length
  };
}
