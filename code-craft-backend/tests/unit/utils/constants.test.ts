import { getLanguageById, isValidLanguage, getSupportedLanguageIds } from '../../../src/utils/constants';
import { SUPPORTED_LANGUAGES, API_CONSTANTS, RATE_LIMITS, ERROR_CODES, HTTP_STATUS } from '../../../src/utils/constants';

describe('Constants and Utilities', () => {
  describe('Helper Functions', () => {
    it('should get the correct language by ID', () => {
      const language = getLanguageById('javascript');
      expect(language).toBeDefined();
      expect(language!.id).toBe('javascript');
    });

    it('should return undefined for invalid language ID', () => {
      const language = getLanguageById('invalid-id');
      expect(language).toBeUndefined();
    });

    it('should validate supported languages correctly', () => {
      const valid = isValidLanguage('python');
      const invalid = isValidLanguage('invalid-lang');

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    it('should return correct array of language IDs', () => {
      const ids = getSupportedLanguageIds();
      expect(ids).toContain('javascript');
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('Constants Validation', () => {
    it('should have correct SUPPORTED_LANGUAGES structure', () => {
      SUPPORTED_LANGUAGES.forEach((language) => {
        expect(language).toHaveProperty('id');
        expect(language).toHaveProperty('label');
        expect(language).toHaveProperty('pistonRuntime');
        expect(language).toHaveProperty('monacoLanguage');
        expect(language).toHaveProperty('icon');
      });
    });

    it('should verify each language config has required properties', () => {
      SUPPORTED_LANGUAGES.forEach((language) => {
        expect(language.id).toBeDefined();
        expect(language.label).toBeDefined();
        expect(language.pistonRuntime).toBeDefined();
        expect(language.monacoLanguage).toBeDefined();
        expect(language.icon).toBeDefined();
      });
    });

    it('should verify API_CONSTANTS object structure', () => {
      expect(API_CONSTANTS).toHaveProperty('MAX_PAGE_SIZE');
      expect(API_CONSTANTS).toHaveProperty('PISTON_API_URL');
      expect(API_CONSTANTS).toHaveProperty('DEFAULT_PAGE_SIZE');
      expect(API_CONSTANTS).toHaveProperty('MAX_CODE_LENGTH');
    });

    it('should verify RATE_LIMITS configuration structure', () => {
      expect(RATE_LIMITS).toHaveProperty('CODE_EXECUTION');
      expect(RATE_LIMITS).toHaveProperty('SNIPPET_CREATION');
      expect(RATE_LIMITS.CODE_EXECUTION).toHaveProperty('windowMs');
      expect(RATE_LIMITS.CODE_EXECUTION).toHaveProperty('max');
    });

    it('should have defined ERROR_CODES', () => {
      expect(ERROR_CODES).toBeDefined();
    });

    it('should have defined HTTP_STATUS constants', () => {
      expect(HTTP_STATUS).toBeDefined();
    });
  });

  describe('Language Configuration', () => {
    it('should verify all languages have unique IDs', () => {
      const ids = SUPPORTED_LANGUAGES.map((lang) => lang.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should verify pistonRuntime configurations are valid', () => {
      SUPPORTED_LANGUAGES.forEach((language) => {
        expect(typeof language.pistonRuntime).toBe('object');
        expect(language.pistonRuntime).toHaveProperty('language');
        expect(language.pistonRuntime).toHaveProperty('version');
      });
    });

    it('should verify monacoLanguage mappings', () => {
      SUPPORTED_LANGUAGES.forEach((language) => {
        expect(typeof language.monacoLanguage).toBe('string');
      });
    });

    it('should verify language icons are present', () => {
      SUPPORTED_LANGUAGES.forEach((language) => {
        expect(language.icon).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle helper functions with null inputs', () => {
      expect(getLanguageById(null as any)).toBeUndefined();
      expect(isValidLanguage(null as any)).toBe(false);
    });

    it('should handle helper functions with undefined inputs', () => {
      expect(getLanguageById(undefined as any)).toBeUndefined();
      expect(isValidLanguage(undefined as any)).toBe(false);
    });

    it('should handle empty string inputs', () => {
      expect(getLanguageById('')).toBeUndefined();
      expect(isValidLanguage('')).toBe(false);
    });

    it('should verify no duplicate language IDs exist', () => {
      const ids = SUPPORTED_LANGUAGES.map((lang) => lang.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should enforce case sensitivity in language ID lookups', () => {
      const language = getLanguageById('JavaScript');
      expect(language).toBeUndefined(); // JavaScript is case-sensitive
    });
  });
});

