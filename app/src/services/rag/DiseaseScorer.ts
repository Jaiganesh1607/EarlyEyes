import type { DiseaseChunk } from './ChunkLoader';
import type { UnifiedQuery } from './QueryBuilder';

export interface DiseaseMatch {
  id: string;
  disease: string;
  category: string;
  icd11_code: string;
  score: number;
  confidence_percent: number;
  matched_symptoms: string[];
  matched_visual: string[];
  immediate_actions: string[];
  future_warnings: string[];
}

export function scoreDiseases(
  chunks: DiseaseChunk[],
  query: UnifiedQuery
): DiseaseMatch[] {
  const results: DiseaseMatch[] = [];

  for (const chunk of chunks) {
    let score = 0;
    const matchedSymptomsSet: Set<string> = new Set();
    const matchedVisualSet: Set<string> = new Set();

    for (const rawTerm of query.all_terms) {
      const term = rawTerm.toLowerCase();

      // top_terms match: +3
      if (chunk.top_terms.includes(term)) {
        score += 3;
      }

      // visual_indicators match: +5
      for (const vi of chunk.visual_indicators) {
        if (vi.toLowerCase().includes(term)) {
          score += 5;
          matchedVisualSet.add(vi);
        }
      }

      // symptoms match: +2
      for (const symptom of chunk.symptoms) {
        if (symptom.toLowerCase().includes(term)) {
          score += 2;
          matchedSymptomsSet.add(symptom);
        }
      }

      // description match: +1
      if (chunk.description.toLowerCase().includes(term)) {
        score += 1;
      }
    }

    // Visual bonus: +10 if we had visual input and matched visual indicators
    if (query.visual_terms.length > 0 && matchedVisualSet.size > 0) {
      score += 10;
    }

    const confidence_percent = Math.min(Math.round((score / 50) * 100), 99);

    if (score >= 5) {
      results.push({
        id: chunk.id,
        disease: chunk.disease,
        category: chunk.category,
        icd11_code: chunk.icd11_code,
        score,
        confidence_percent,
        matched_symptoms: Array.from(matchedSymptomsSet).slice(0, 3),
        matched_visual: Array.from(matchedVisualSet).slice(0, 3),
        immediate_actions: chunk.immediate_actions,
        future_warnings: chunk.future_warnings,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}
