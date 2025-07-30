import {
  escapeRegexSpecialChars,
  sanitizeMongoQuery,
  sanitizeRequestBody,
  validateObjectId,
  sanitizeSearchInput,
  sanitizePagination
} from '../../../src/utils/sanitization';

describe('Sanitization Utilities', () => {
  describe('escapeRegexSpecialChars()', () => {
    it('should escape all regex special characters', () => {
      const input = 'test.*+?^${}()|[]\\';
      const expected = 'test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
      expect(escapeRegexSpecialChars(input)).toBe(expected);
    });

    it('should handle mixed content with normal text and special chars', () => {
      const input = 'hello.world[123]';
      const expected = 'hello\\.world\\[123\\]';
      expect(escapeRegexSpecialChars(input)).toBe(expected);
    });

    it('should handle empty string', () => {
      expect(escapeRegexSpecialChars('')).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(escapeRegexSpecialChars(null as any)).toBe('');
      expect(escapeRegexSpecialChars(undefined as any)).toBe('');
      expect(escapeRegexSpecialChars(123 as any)).toBe('123');
    });

    it('should handle already escaped characters', () => {
      const input = 'test\\.already\\*escaped';
      const expected = 'test\\\\\\.already\\\\\\*escaped';
      expect(escapeRegexSpecialChars(input)).toBe(expected);
    });
  });

  describe('sanitizeMongoQuery()', () => {
    it('should remove $ operators', () => {
      const query = {
        name: 'test',
        $where: 'malicious code',
        $ne: 'something',
        age: { $gt: 18 }
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized.$where).toBeUndefined();
      expect(sanitized.$ne).toBeUndefined();
      expect(sanitized.name).toBe('test');
      expect(sanitized.age).toEqual({});
    });

    it('should remove dot notation keys', () => {
      const query = {
        'user.admin': true,
        'nested.field.value': 'test',
        normalKey: 'value'
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized['user.admin']).toBeUndefined();
      expect(sanitized['nested.field.value']).toBeUndefined();
      expect(sanitized.normalKey).toBe('value');
    });

    it('should recursively sanitize nested objects', () => {
      const query = {
        user: {
          name: 'test',
          $where: 'malicious',
          nested: {
            $ne: 'bad',
            safe: 'value'
          }
        }
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized.user.$where).toBeUndefined();
      expect(sanitized.user.nested.$ne).toBeUndefined();
      expect(sanitized.user.name).toBe('test');
      expect(sanitized.user.nested.safe).toBe('value');
    });

    it('should sanitize arrays', () => {
      const query = {
        items: [
          { $where: 'bad', name: 'item1' },
          { $ne: 'bad', value: 'item2' }
        ]
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized.items[0].$where).toBeUndefined();
      expect(sanitized.items[0].name).toBe('item1');
      expect(sanitized.items[1].$ne).toBeUndefined();
      expect(sanitized.items[1].value).toBe('item2');
    });

    it('should handle null, undefined, and non-object inputs', () => {
      expect(sanitizeMongoQuery(null)).toBeNull();
      expect(sanitizeMongoQuery(undefined)).toBeUndefined();
      expect(sanitizeMongoQuery('string')).toBe('string');
      expect(sanitizeMongoQuery(123)).toBe(123);
    });

    it('should preserve safe keys and values', () => {
      const query = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        tags: ['tag1', 'tag2']
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized).toEqual(query);
    });
  });

  describe('sanitizeRequestBody()', () => {
    it('should deep clone and sanitize request body', () => {
      const body = {
        name: 'test',
        $where: 'malicious',
        nested: {
          $ne: 'bad'
        }
      };

      const sanitized = sanitizeRequestBody(body);
      expect(sanitized).not.toBe(body); // Different object
      expect(sanitized.$where).toBeUndefined();
      expect(sanitized.nested.$ne).toBeUndefined();
      expect(sanitized.name).toBe('test');
    });

    it('should handle complex nested structures', () => {
      const body = {
        users: [
          {
            name: 'user1',
            permissions: {
              $where: 'bad',
              admin: true
            }
          }
        ],
        settings: {
          'system.config': 'value',
          normal: 'setting'
        }
      };

      const sanitized = sanitizeRequestBody(body);
      expect(sanitized.users[0].permissions.$where).toBeUndefined();
      expect(sanitized.users[0].permissions.admin).toBe(true);
      expect(sanitized.settings['system.config']).toBeUndefined();
      expect(sanitized.settings.normal).toBe('setting');
    });

    it('should handle arrays containing objects with $ operators', () => {
      const body = {
        filters: [
          { $or: [{ name: 'test' }] },
          { $and: [{ age: 25 }] }
        ]
      };

      const sanitized = sanitizeRequestBody(body);
      expect(sanitized.filters[0].$or).toBeUndefined();
      expect(sanitized.filters[1].$and).toBeUndefined();
    });

    it('should handle null/undefined body', () => {
      expect(sanitizeRequestBody(null)).toBeNull();
      expect(sanitizeRequestBody(undefined)).toBeUndefined();
    });
  });

  describe('validateObjectId()', () => {
    it('should validate valid MongoDB ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        '5f9b2a3b9d3e2a1b3c4d5e6f'
      ];

      validIds.forEach(id => {
        expect(validateObjectId(id)).toBe(true);
      });
    });

    it('should reject invalid ObjectId formats', () => {
      const invalidIds = [
        '123',
        'invalid-id',
        '507f1f77bcf86cd79943901', // Too short
        '507f1f77bcf86cd7994390111', // Too long
        '507f1f77bcf86cd79943901g', // Invalid character
      ];

      invalidIds.forEach(id => {
        expect(validateObjectId(id)).toBe(false);
      });
    });

    it('should handle null, undefined, and non-string inputs', () => {
      expect(validateObjectId(null as any)).toBe(false);
      expect(validateObjectId(undefined as any)).toBe(false);
      expect(validateObjectId(123 as any)).toBe(false);
      expect(validateObjectId({} as any)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateObjectId('')).toBe(false);
      expect(validateObjectId('0'.repeat(24))).toBe(true);
      expect(validateObjectId('f'.repeat(24))).toBe(true);
    });
  });

  describe('sanitizeSearchInput()', () => {
    it('should sanitize various search terms', () => {
      const input = 'search term with spaces';
      const result = sanitizeSearchInput(input);
      expect(result).toBe('search term with spaces');
    });

    it('should limit length to 100 characters', () => {
      const longInput = 'a'.repeat(150);
      const result = sanitizeSearchInput(longInput);
      expect(result.length).toBe(100);
      expect(result).toBe('a'.repeat(100));
    });

    it('should escape regex special characters', () => {
      const input = 'search.*test[123]';
      const result = sanitizeSearchInput(input);
      expect(result).toBe('search\\.\\*test\\[123\\]');
    });

    it('should trim whitespace', () => {
      const input = '  search term  ';
      const result = sanitizeSearchInput(input);
      expect(result).toBe('search term');
    });

    it('should handle null/undefined inputs', () => {
      expect(sanitizeSearchInput(null as any)).toBe('');
      expect(sanitizeSearchInput(undefined as any)).toBe('');
    });

    it('should handle Unicode characters', () => {
      const input = 'search 中文 émojis 😀';
      const result = sanitizeSearchInput(input);
      expect(result).toBe('search 中文 émojis 😀');
    });
  });

  describe('sanitizePagination()', () => {
    it('should sanitize valid pagination inputs', () => {
      const result = sanitizePagination(2, 20);
      expect(result).toEqual({
        page: 2,
        limit: 20,
        skip: 20
      });
    });

    it('should enforce minimum boundaries', () => {
      const result = sanitizePagination(0, 0);
      expect(result).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });
    });

    it('should enforce maximum limit of 100', () => {
      const result = sanitizePagination(1, 200);
      expect(result).toEqual({
        page: 1,
        limit: 100,
        skip: 0
      });
    });

    it('should calculate skip correctly', () => {
      const result = sanitizePagination(5, 10);
      expect(result.skip).toBe(40);
    });

    it('should handle string inputs', () => {
      const result = sanitizePagination('3' as any, '15' as any);
      expect(result).toEqual({
        page: 3,
        limit: 15,
        skip: 30
      });
    });

    it('should use defaults for undefined/null parameters', () => {
      const result1 = sanitizePagination(undefined as any, undefined as any);
      expect(result1).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });

      const result2 = sanitizePagination(null as any, null as any);
      expect(result2).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle deeply nested objects with mixed safe/unsafe keys', () => {
      const query = {
        level1: {
          safe: 'value',
          $unsafe: 'should be removed',
          level2: {
            'dot.notation': 'remove',
            normal: 'keep',
            level3: {
              $where: 'remove',
              data: 'keep'
            }
          }
        }
      };

      const sanitized = sanitizeMongoQuery(query);
      expect(sanitized.level1.safe).toBe('value');
      expect(sanitized.level1.$unsafe).toBeUndefined();
      expect(sanitized.level1.level2['dot.notation']).toBeUndefined();
      expect(sanitized.level1.level2.normal).toBe('keep');
      expect(sanitized.level1.level2.level3.$where).toBeUndefined();
      expect(sanitized.level1.level2.level3.data).toBe('keep');
    });

    it('should handle circular references (JSON.parse/stringify limitation)', () => {
      const obj: any = { a: 1 };
      obj.circular = obj;

      // sanitizeRequestBody uses JSON.parse/stringify which can't handle circular refs
      expect(() => sanitizeRequestBody(obj)).toThrow();
    });

    it('should handle very long input strings', () => {
      const longString = 'a'.repeat(10000);
      const sanitized = sanitizeSearchInput(longString);
      expect(sanitized.length).toBe(100);
    });

    it('should handle Unicode characters in search terms', () => {
      const unicode = '测试 テスト тест emoji 🚀';
      const sanitized = sanitizeSearchInput(unicode);
      expect(sanitized).toBe('测试 テスト тест emoji 🚀');
    });
  });
});
