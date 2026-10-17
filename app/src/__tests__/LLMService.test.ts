jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
  exists: jest.fn(),
  downloadFile: jest.fn(),
  unlink: jest.fn(),
  copyFileAssets: jest.fn()
}));

jest.mock('llama.rn', () => ({
  initLlama: jest.fn()
}));

import { llmService } from '../llm/LLMService';

describe('LLMService JSON Parser', () => {
  it('should parse a standard JSON array', () => {
    const raw = 'Here is your result:\n```json\n[{"id":"test","disease":"Malnutrition"}]\n```';
    // Access the private method for testing using any
    const result = (llmService as any)._parseResponse(raw);
    expect(result.parseError).toBeUndefined();
    expect(result.results.length).toBe(1);
    expect(result.results[0].disease).toBe('Malnutrition');
  });

  it('should auto-fix truncated trailing array brackets', () => {
    // Missing the closing ] bracket
    const raw = '[{"id":"test","disease":"Malnutrition"}';
    const result = (llmService as any)._parseResponse(raw);
    expect(result.parseError).toBeUndefined();
    expect(result.results.length).toBe(1);
    expect(result.results[0].disease).toBe('Malnutrition');
  });

  it('should gracefully handle single objects (missing array brackets entirely)', () => {
    const raw = '{"id":"test","disease":"Malnutrition"}';
    const result = (llmService as any)._parseResponse(raw);
    expect(result.parseError).toBeUndefined();
    expect(result.results.length).toBe(1);
    expect(result.results[0].disease).toBe('Malnutrition');
  });

  it('should return empty results and set parseError on totally invalid output', () => {
    const raw = 'Sorry, I cannot diagnose this.';
    const result = (llmService as any)._parseResponse(raw);
    expect(result.parseError).toBeDefined();
    expect(result.results.length).toBe(0);
  });
});

describe('LLMService Chat', () => {
  it('should call completion with correct stop tokens and return trimmed text', async () => {
    const mockCompletion = jest.fn().mockResolvedValue({ text: ' This is the chat response. ' });
    (llmService as any)._status = 'ready';
    (llmService as any)._llamaContext = {
      completion: mockCompletion
    };

    const history: any[] = [];
    const response = await llmService.runChat('Context', history, 'Question');

    expect(mockCompletion).toHaveBeenCalled();
    const args = mockCompletion.mock.calls[0][0];
    expect(args.stop).toEqual(['<|eot_id|>', '<|end_of_text|>', '```', '<|im_end|>']);
    expect(response).toBe('This is the chat response.');
  });
});
