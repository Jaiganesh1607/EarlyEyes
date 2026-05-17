import chunksData from '../../assets/rag/chunk_map.json';

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
  top_terms: string[];
  content: string;
}

let cache: DiseaseChunk[] | null = null;

export function getChunks(): DiseaseChunk[] {
  if (!cache) {
    cache = (chunksData as unknown) as DiseaseChunk[];
  }
  return cache;
}
