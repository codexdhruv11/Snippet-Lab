import {
  normalizeTag,
  normalizeTags,
  isValidTagLength,
  isValidTagFormat
} from '../../../src/utils/tagNormalization';
import { SPECIAL_PATTERNS } from '../../../src/utils/constants';

describe('Tag Normalization Utilities', () => {
  describe('normalizeTag()', () => {
    it('should handle special programming language patterns correctly', () => {
      const inputOutputMap = {
        'C#': 'csharp',
        'C++': 'cpp',
        '.NET': 'dotnet'
      };

      for (const [input, output] of Object.entries(inputOutputMap)) {
        expect(normalizeTag(input)).toBe(output);
      }
    });

    it('should apply standard normalization correctly', () => {
      const inputOutputMap = {
        'Java Script': 'java-script',
        'node.js': 'node-js',
        'TypeScript': 'typescript'
      };

      for (const [input, output] of Object.entries(inputOutputMap)) {
        expect(normalizeTag(input)).toBe(output);
      }
    });

    it('should remove special characters and apply cleanup', () => {
      const inputOutputMap = {
        'hello@world': 'helloworld',
        'node-js': 'node-js',
        'a---b': 'a-b'
      };

      for (const [input, output] of Object.entries(inputOutputMap)) {
        expect(normalizeTag(input)).toBe(output);
      }
    });

    it('should handle empty string and non-string inputs', () => {
      expect(normalizeTag('')).toBe('');
      expect(normalizeTag(null as any)).toBe('');
      expect(normalizeTag(undefined as any)).toBe('');
    });
  });

  describe('normalizeTags()', () => {
    it('should normalize array of mixed tags', () => {
      const input = ['Java Script', 'node.js', 'C++'];
      const expected = ['java-script', 'node-js', 'cpp'];
      expect(normalizeTags(input)).toEqual(expected);
    });

    it('should remove duplicates after normalization', () => {
      const input = ['Java Script', 'java-script', 'JAVA-SCRIPT'];
      const expected = ['java-script'];
      expect(normalizeTags(input)).toEqual(expected);
    });

    it('should filter out empty tags', () => {
      const input = ['Java Script', '', ''];
      const expected = ['java-script'];
      expect(normalizeTags(input)).toEqual(expected);
    });

    it('should handle non-array and non-string elements', () => {
      expect(normalizeTags(null as any)).toEqual([]);
      expect(normalizeTags([null, undefined, 123] as any)).toEqual(['123']);
    });
  });

  describe('isValidTagLength()', () => {
    it('should validate lengths within boundaries', () => {
      expect(isValidTagLength('')).toBe(false);
      expect(isValidTagLength('a')).toBe(true);
      expect(isValidTagLength('a'.repeat(30))).toBe(true);
      expect(isValidTagLength('a'.repeat(31))).toBe(false);
    });
  });

  describe('isValidTagFormat()', () => {
    it('should validate correct formats', () => {
      expect(isValidTagFormat('valid-tag')).toBe(true);
      expect(isValidTagFormat('anotherValidTag')).toBe(true);
      expect(isValidTagFormat('invalid tag')).toBe(false);
      expect(isValidTagFormat('-invalid')).toBe(false);
      expect(isValidTagFormat('invalid-')).toBe(false);
    });
  });

  describe('Special Pattern Mapping', () => {
    it('should map special patterns case insensitively', () => {
      for (const [pattern, replacement] of Object.entries(SPECIAL_PATTERNS)) {
        const lowerPattern = pattern.toLowerCase();
        expect(normalizeTag(lowerPattern)).toBe(replacement);
        expect(normalizeTag(pattern.toUpperCase())).toBe(replacement);
      }
    });

    it('should ensure special patterns override standard normalization', () => {
      expect(normalizeTag('c#')).toBe('csharp');
      expect(normalizeTag('node js')).toBe('node-js');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tags with only special characters', () => {
      expect(normalizeTag('!@#$%^')).toBe('');
    });

    it('should handle very long tags', () => {
      const longTag = 'a'.repeat(100);
      expect(normalizeTag(longTag)).toBe(longTag);
    });

    it('should handle tags with mixed case special patterns', () => {
      expect(normalizeTag('c# plus plus')).toBe('csharp-plus-plus');
    });

    it('should handle Unicode characters in tags', () => {
      expect(normalizeTag('测试')).toBe('测试');
    });

    it('should handle tags that become empty after normalization', () => {
      expect(normalizeTag('@!')).toBe('');
    });
  });

  describe('Integration Tests', () => {
    it('should pass the complete normalization pipeline', () => {
      const input = ['C#', 'node js', 'python3', 'react.js'];
      const normalized = normalizeTags(input).filter(isValidTagFormat).filter(isValidTagLength);
      expect(normalized).toEqual(['csharp', 'node-js', 'python3', 'react-js']);
    });

    it('should not pass invalid tags after normalization', () => {
      const input = ['C#', 'node js###'];
      const normalized = normalizeTags(input).filter(isValidTagFormat).filter(isValidTagLength);
      expect(normalized).toEqual(['csharp']);
    });

    it('should handle boundary conditions for length validation', () => {
      const tags = ['a'.repeat(30), 'a'.repeat(31)];
      const validTags = tags.filter(isValidTagLength);
      expect(validTags).toEqual(['a'.repeat(30)]);
    });
  });
});

