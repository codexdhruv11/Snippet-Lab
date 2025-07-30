import axios from 'axios';
import { CodeExecutionService } from '../../../src/services/codeExecution';
import { logger } from '../../../src/utils/logger';
import { API_CONSTANTS } from '../../../src/utils/constants';

// Mock axios
jest.mock('axios');

// Mock logger
jest.mock('../../../src/utils/logger');

describe('CodeExecutionService', () => {
  let service: CodeExecutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CodeExecutionService();
  });

  describe('executeCode()', () => {
    it('should succeed with valid Piston API response', async () => {
      const mockResponse = {
        data: {
          run: {
            stdout: 'Hello World',
            stderr: '',
            code: 0,
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.executeCode('javascript', 'console.log("Hello World")');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello World');
      expect(result.error).toBeUndefined();
    });

    it('should handle compilation errors', async () => {
      const mockResponse = {
        data: {
          compile: {
            stdout: '',
            stderr: 'Syntax Error',
            code: 1,
          },
          run: {
            stdout: '',
            stderr: '',
            code: 0,
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.executeCode('javascript', 'console.log("Hello World")');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Syntax Error');
    });

    it('should handle runtime errors', async () => {
      const mockResponse = {
        data: {
          run: {
            stdout: '',
            stderr: 'ReferenceError: foo is not defined',
            code: 1,
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.executeCode('javascript', 'foo()');
      expect(result.success).toBe(false);
      expect(result.error).toContain('ReferenceError');
    });

    it('should timeout with ECONNABORTED', async () => {
      const error = new Error('Request timeout');
      (error as any).code = 'ECONNABORTED';
      (axios.post as jest.Mock).mockRejectedValue(error);
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(true);
      
      const result = await service.executeCode('javascript', 'console.log("Hello")');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution timed out');
    });

    it('should handle unsupported languages', async () => {
      await expect(service.executeCode('unsupported-lang', 'console.log("Hello")')).rejects.toThrow('Unsupported language');
    });

    it('should validate empty code submissions', async () => {
      await expect(service.executeCode('javascript', '')).rejects.toThrow('Code cannot be empty');
    });

    it('should validate code length exceeds', async () => {
      const longCode = 'x'.repeat(API_CONSTANTS.MAX_CODE_LENGTH + 1);
      await expect(service.executeCode('javascript', longCode)).rejects.toThrow(`Code exceeds maximum length of ${API_CONSTANTS.MAX_CODE_LENGTH} characters`);
    });
  });

  describe('getSupportedLanguages()', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      
      const jsLang = languages.find(lang => lang.id === 'javascript');
      expect(jsLang).toBeDefined();
      expect(jsLang).toHaveProperty('label');
      expect(jsLang).toHaveProperty('icon');
      expect(jsLang).toHaveProperty('monacoLanguage');
    });
  });

  describe('Integration Tests', () => {
    it('should send correct payload to Piston API', async () => {
      const mockResponse = {
        data: {
          run: {
            stdout: 'Hello World',
            stderr: '',
            code: 0,
          }
        }
      };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      await service.executeCode('javascript', 'console.log("Hello World")');

      expect(axios.post).toHaveBeenCalledWith(
        API_CONSTANTS.PISTON_API_URL,
        expect.objectContaining({
          language: 'javascript',
          version: '18.15.0',
          files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              content: 'console.log("Hello World")'
            })
          ]),
          stdin: '',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle axios errors and return error result', async () => {
      const mockError = new Error('Network Error');
      (axios.post as jest.Mock).mockRejectedValue(mockError);
      (axios.isAxiosError as any) = jest.fn().mockReturnValue(false);

      const result = await service.executeCode('python', 'print("Hello")');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(logger.error).toHaveBeenCalledWith('Code execution failed:', expect.any(Object));
    });
  });
});

