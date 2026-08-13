import chunksData from '../../../assets/rag/chunk_map.json';

export interface DiseaseChunk {
  id: string;
  disease: string;
  category: string;
  icd11_code: string;
  description: string;
  symptoms: string[];
  visual_indicators: string[];
  future_warnings: string[];
  immediate_actions: string[];
  nutritional_recommendations: string[];
  age_group: string;
  who_muac_threshold: string;
  top_terms: string[];
  content: string;
  metadata: {
    sources: Array<{ label: string; url: string }>;
    sourceLabel: string;
    sourceUrls: string[];
  };
}

let cache: DiseaseChunk[] | null = null;

export function getChunks(): DiseaseChunk[] {
  if (!cache) {
    cache = chunksData as unknown as DiseaseChunk[];
  }
  return cache;
}
