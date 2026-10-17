// ============================================================
// PromptBuilder.ts
// Formats the final prompt string sent to the Gemma model.
// Uses Gemma's <start_of_turn> / <end_of_turn> control tokens
// so the instruction-tuned model follows the JSON-only directive.
// ============================================================

import { LLMInput, ChatMessage } from './types';

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
Your ONLY output must be a single valid JSON array containing the matching conditions.
Do NOT echo the reference text. Output ONLY the raw JSON array.

Each element in the array must follow this exact structure:
{
  "id": "unique_snake_case_id",
  "disease": "Full Disease Name",
  "risk_level": "urgent or monitor or ok",
  "confidence_percent": 85,
  "reasoning": "A concise 1-2 sentence explanation of why this matches the symptoms"
}

If multiple conditions match, include one object per condition.
If nothing matches, or if the patient appears healthy/normal with no concerning indicators, return an empty array: []`;

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

  // Llama 3 format
  return (
    `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n` +
    `${SYSTEM_INSTRUCTION}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n` +
    `${userContent}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`
  );
};

// ── PromptBuilder class (interface contract) ────────────────────────────

const CHAT_SYSTEM_INSTRUCTION = `You are a medical explainer AI.
You are NOT diagnosing the patient. The diagnosis has ALREADY been made by the clinical app.
Your only job is to politely answer the user's questions by explaining the provided screening results in simple terms.
Do NOT refuse to answer by saying "I cannot provide a diagnosis" or "Consult a doctor" as your primary response. You MUST explain the condition based on the context provided.`;

export const buildChatPrompt = (contextText: string, history: ChatMessage[], newQuestion: string): string => {
  let prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${CHAT_SYSTEM_INSTRUCTION}\n\n=== PATIENT SCREENING CONTEXT ===\n${contextText}\n=================================<|eot_id|>`;
  
  for (const msg of history) {
    prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.text}<|eot_id|>`;
  }
  
  prompt += `<|start_header_id|>user<|end_header_id|>\n\n${newQuestion}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
  
  return prompt;
};

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