import { buildChatPrompt } from '../llm/PromptBuilder';
import type { ChatMessage } from '../llm/types';

describe('PromptBuilder', () => {
  it('should correctly format a chat prompt with history', () => {
    const context = 'Diagnosis: Marasmus\nVisual Indicators: sunken_eyes';
    const history: ChatMessage[] = [
      { role: 'user', text: 'What is Marasmus?' },
      { role: 'assistant', text: 'It is a form of severe malnutrition.' }
    ];
    const newQuestion = 'What should I do?';

    const result = buildChatPrompt(context, history, newQuestion);

    // It should contain the system prompt
    expect(result).toContain('You are a helpful, compassionate medical AI assistant');
    // It should contain the context
    expect(result).toContain('Context:\nDiagnosis: Marasmus');
    // It should contain the history
    expect(result).toContain('<|start_header_id|>user<|end_header_id|>\n\nWhat is Marasmus?<|eot_id|>');
    expect(result).toContain('<|start_header_id|>assistant<|end_header_id|>\n\nIt is a form of severe malnutrition.<|eot_id|>');
    // It should end with the new question and the assistant header waiting for generation
    expect(result).toContain('<|start_header_id|>user<|end_header_id|>\n\nWhat should I do?<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n');
  });

  it('should correctly format a chat prompt without history', () => {
    const context = 'Diagnosis: Kwashiorkor';
    const history: ChatMessage[] = [];
    const newQuestion = 'Tell me more.';

    const result = buildChatPrompt(context, history, newQuestion);

    expect(result).toContain('Context:\nDiagnosis: Kwashiorkor');
    expect(result).not.toContain('<|start_header_id|>assistant<|end_header_id|>\n\nIt is a form'); // no history
    expect(result).toContain('<|start_header_id|>user<|end_header_id|>\n\nTell me more.<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n');
  });
});
