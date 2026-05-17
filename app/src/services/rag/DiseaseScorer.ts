import { DiseaseChunk } from './ChunkLoader';
import { UnifiedQuery } from './QueryBuilder';

export interface DiseaseMatch {
  id: string;
  disease: string;
  category: string;
  icd11_code: string;
  age_group: string;
  who_muac_threshold: string;
  score: number;
  confidence_percent: number;
  matched_symptoms: string[];
  matched_visual: string[];
  immediate_actions: string[];
  future_warnings: string[];
  nutritional_recommendations: string[];
}

export function scoreDiseases(chunks: DiseaseChunk[], query: UnifiedQuery): DiseaseMatch[] {
  const results: DiseaseMatch[] = [];

  for (const chunk of chunks) {
    let score = 0;
    const matched_symptoms = new Set<string>();
    const matched_visual = new Set<string>();

    for (const term of query.all_terms) {
      // top_terms match - highest weight
      if (chunk.top_terms.some(t => t.toLowerCase() === term)) {
        score += 3;
      }

      // visual_indicators match - strong clinical signal
      for (const vi of chunk.visual_indicators) {
        if (vi.toLowerCase().includes(term)) {
          score += 5;
          matched_visual.add(vi);
        }
      }

      // symptoms match
      for (const sym of chunk.symptoms) {
        if (sym.toLowerCase().includes(term)) {
          score += 2;
          matched_symptoms.add(sym);
        }
      }

      // description match - lowest weight
      if (chunk.description.toLowerCase().includes(term)) {
        score += 1;
      }
    }

    // bonus: image pipeline contributed visual terms AND disease has visual matches
    if (query.visual_terms.length > 0 && matched_visual.size > 0) {
      score += 10;
    }

    // bonus: who_muac_threshold present and score already high (malnutrition confirmation)
    if (chunk.who_muac_threshold.length > 0 && score > 15) {
      score += 5;
    }

    const confidence_percent = Math.min(Math.round((score / 60) * 100), 99);

    if (score >= 5) {
      results.push({
        id: chunk.id,
        disease: chunk.disease,
        category: chunk.category,
        icd11_code: chunk.icd11_code,
        age_group: chunk.age_group,
        who_muac_threshold: chunk.who_muac_threshold,
        score,
        confidence_percent,
        matched_symptoms: Array.from(matched_symptoms).slice(0, 3),
        matched_visual: Array.from(matched_visual).slice(0, 3),
        immediate_actions: chunk.immediate_actions,
        future_warnings: chunk.future_warnings,
        nutritional_recommendations: chunk.nutritional_recommendations
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
