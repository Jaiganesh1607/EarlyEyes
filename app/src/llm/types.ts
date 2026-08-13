// ============================================================
// types.ts — All shared TypeScript types for the AI/LLM layer
// ============================================================

export interface DiseaseSource {
  label: string;
  url: string;
}

export interface DiseaseMetadata {
  sources: DiseaseSource[];
  sourceLabel: string;
  sourceUrls: string[];
}

export interface DiseaseResult {
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
  content: string;
  metadata: DiseaseMetadata;
}

export interface LLMInput {
  /** Free-text symptoms as described by the parent/caregiver */
  symptoms: string;
  /** RAG-retrieved content from your knowledge base */
  ragContent: string;
  /** Optional: child's age (e.g. "8 months") */
  childAge?: string;
  /** Optional: child's weight (e.g. "5.2 kg") */
  childWeight?: string;
  /** Optional: MUAC measurement */
  muac?: string;
  /** Optional: any extra clinical context */
  additionalContext?: string;
}

export interface LLMOutput {
  results: DiseaseResult[];
  rawResponse: string;
  parseError?: string;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}

export type ModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'loading'
  | 'ready'
  | 'error';