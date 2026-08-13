// ============================================================
// PromptBuilder.ts
// Formats the final prompt string sent to the Gemma model.
// Uses Gemma's <start_of_turn> / <end_of_turn> control tokens
// so the instruction-tuned model follows the JSON-only directive.
// ============================================================

import { LLMInput } from './types';

// ── Types referenced by the interface contract ──────────────────────────

/** Result from the CV/image-analysis pipeline. */
export interface ImageAnalysisResult {
  /** Detected visual indicators (e.g. "visible_ribs", "edema") */
  indicators: string[];
  /** Free-text summary from the vision model */
  summary: string;
  /** Confidence scores keyed by indicator */
  confidence?: Record<string, number>;
}

/** A chunk retrieved from the RAG knowledge base. */
export interface RagChunk {
  /** The text content of the chunk */
  content: string;
  /** Source label (e.g. "WHO guidelines") */
  source?: string;
  /** Relevance score */
  score?: number;
}

const SYSTEM_INSTRUCTION = `You are a specialist medical AI for pediatric malnutrition diagnosis.
Your ONLY output must be a valid JSON array — no markdown, no preamble, no explanation.
Output ONLY the raw JSON array. Do NOT wrap it in code blocks.

Each element in the array must follow this exact structure:
{
  "id": "unique_snake_case_id",
  "disease": "Full Disease Name",
  "category": "category_slug",
  "icd11_code": "ICD-11 code",
  "description": "Clinical description",
  "symptoms": ["symptom1", "symptom2"],
  "visual_indicators": ["indicator1"],
  "future_warnings": ["warning1"],
  "immediate_actions": ["action1"],
  "nutritional_recommendations": ["rec1"],
  "age_group": "age range string",
  "who_muac_threshold": "MUAC threshold e.g. <11.5 cm",
  "content": "Plain text summary for display",
  "metadata": {
    "sources": [{ "label": "WHO", "url": "https://..." }],
    "sourceLabel": "WHO, Wikipedia",
    "sourceUrls": ["https://..."]
  }
}

If multiple conditions match, include one object per condition.
If nothing matches, return an empty array: []`;

/**
 * Build the fully formatted prompt ready for Gemma inference.
 */
export const buildPrompt = (input: LLMInput): string => {
  const lines: string[] = [];

  lines.push(`Symptoms reported by caregiver:\n${input.symptoms}`);

  if (input.childAge) {
    lines.push(`Child age: ${input.childAge}`);
  }
  if (input.childWeight) {
    lines.push(`Child weight: ${input.childWeight}`);
  }
  if (input.muac) {
    lines.push(`MUAC: ${input.muac}`);
  }
  if (input.additionalContext) {
    lines.push(`Additional context: ${input.additionalContext}`);
  }

  lines.push(`\nReference medical content from knowledge base:\n${input.ragContent}`);

  lines.push(
    `\nBased on the above information, output a JSON array of matching conditions. Remember: ONLY valid raw JSON, nothing else.`,
  );

  const userContent = lines.join('\n');

  // Gemma instruction-tuned format
  return (
    `<start_of_turn>user\n` +
    `${SYSTEM_INSTRUCTION}\n\n` +
    `${userContent}<end_of_turn>\n` +
    `<start_of_turn>model\n`
  );
};

// ── PromptBuilder class (interface contract) ────────────────────────────

export class PromptBuilder {
  /**
   * Build a prompt from CV analysis results and RAG chunks.
   * Delegates to buildPrompt() internally.
   */
  static build(analysis: ImageAnalysisResult, chunks: RagChunk[]): string {
    const ragContent = chunks
      .map((c) => `[${c.source ?? 'unknown'}]: ${c.content}`)
      .join('\n\n');

    const symptoms = [
      `Visual indicators: ${analysis.indicators.join(', ') || 'none'}`,
      `Vision summary: ${analysis.summary}`,
    ].join('\n');

    return buildPrompt({
      symptoms,
      ragContent,
    });
  }
}