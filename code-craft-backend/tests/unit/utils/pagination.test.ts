import { parsePaginationParams, buildPaginationResponse, parseCursorPaginationParams, applyCursorPagination, buildCursorPaginationResponse, paginationMiddleware, cursorPaginationMiddleware } from '../../../src/utils/pagination';
import { API_CONSTANTS } from '../../../src/utils/constants';
import { Request } from 'express';

describe('Pagination Utilities', () => {
  describe('Pagination Parameter Parsing', () => {
    it('should parse valid page and limit values', () => {
      const req = { query: { page: '2', limit: '10' } } as Request;
      const { page, limit } = parsePaginationParams(req);
      expect(page).toBe(2);
      expect(limit).toBe(10);
    });

    it('should handle invalid/missing query parameters gracefully', () => {
      const req = { query: { page: 'invalid', limit: '' } } as Request;
      const { page, limit } = parsePaginationParams(req);
      expect(page).toBe(1);
      expect(limit).toBe(API_CONSTANTS.DEFAULT_PAGE_SIZE);
    });

    it('should validate page and limit boundaries', () => {
      const req1 = { query: { page: '0', limit: '101' } } as Request;
      const result1 = parsePaginationParams(req1);
      expect(result1.page).toBe(1);
      expect(result1.limit).toBe(API_CONSTANTS.MAX_PAGE_SIZE);

      const req2 = { query: { page: '-1', limit: '-50' } } as Request;
      const result2 = parsePaginationParams(req2);
      expect(result2.page).toBe(1);
      expect(result2.limit).toBe(API_CONSTANTS.DEFAULT_PAGE_SIZE);
    });

    it('should calculate skip correctly', () => {
      const req = { query: { page: '3', limit: '10' } } as Request;
      const skip = parsePaginationParams(req).skip;
      expect(skip).toBe(20);
    });
  });

  describe('Pagination Response Building', () => {
    it('should build pagination response correctly', () => {
      const data = new Array(10).fill('item');
      const response = buildPaginationResponse(data, 30, 1, 10);
      expect(response.data).toHaveLength(10);
      expect(response.pagination.total).toBe(30);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should handle edge cases correctly', () => {
      const response1 = buildPaginationResponse([], 0, 1, 10);
      expect(response1.pagination.totalPages).toBe(0);
      expect(response1.pagination.hasNext).toBe(false);
      expect(response1.pagination.hasPrev).toBe(false);

      const response2 = buildPaginationResponse(['item'], 1, 1, 10);
      expect(response2.pagination.totalPages).toBe(1);
      expect(response2.pagination.hasNext).toBe(false);
      expect(response2.pagination.hasPrev).toBe(false);

      const response3 = buildPaginationResponse(['item'], 10, 2, 10);
      expect(response3.pagination.page).toBe(2);
      expect(response3.pagination.hasPrev).toBe(true);
    });
  });

  describe('Cursor Pagination', () => {
    it('should parse valid cursor parameters', () => {
      const req = { query: { cursor: 'abc123', limit: '20' } } as Request;
      const { cursor, limit } = parseCursorPaginationParams(req);
      expect(cursor).toBe('abc123');
      expect(limit).toBe(20);
    });

    it('should build cursor pagination response with hasNext', () => {
      const data = new Array(11).fill(null).map((_, i) => ({
        _id: `id${i}`,
        createdAt: new Date(),
      }));
      const response = buildCursorPaginationResponse(data, 10);
      expect(response.data).toHaveLength(10);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.nextCursor).toBeDefined();
    });

    it('should apply cursor pagination to query', () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      const cursor = Buffer.from('id123|2023-01-01T00:00:00.000Z').toString('base64');
      applyCursorPagination(mockQuery, cursor, 10);

      expect(mockQuery.where).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(11);
    });

    it('should handle invalid cursor gracefully', () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      applyCursorPagination(mockQuery, 'invalid-cursor', 10);

      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalled();
    });
  });

  describe('Pagination Middleware', () => {
    it('should add pagination params to request', () => {
      const req = { query: { page: '1', limit: '10' } } as Request;
      const res = {} as any;
      const next = jest.fn();
      paginationMiddleware(req, res, next);
      expect(req.pagination).toBeDefined();
      expect(req.pagination.page).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('should add cursor params to request', () => {
      const req = { query: { cursor: 'abc123', limit: '20' } } as Request;
      const res = {} as any;
      const next = jest.fn();
      cursorPaginationMiddleware(req, res, next);
      expect(req.cursorPagination).toBeDefined();
      expect(req.cursorPagination.cursor).toBe('abc123');
      expect(req.cursorPagination.limit).toBe(20);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing cursor parameters', () => {
      const req = { query: {} } as Request;
      const { cursor, limit } = parseCursorPaginationParams(req);
      expect(cursor).toBeUndefined();
      expect(limit).toBe(API_CONSTANTS.DEFAULT_PAGE_SIZE);
    });

    it('should handle pagination with zero total items', () => {
      const response = buildPaginationResponse([], 0, 1, 10);
      expect(response.pagination.total).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
    });

    it('should handle limits exceeding the maximum', () => {
      const req = { query: { limit: '1000' } } as Request;
      const { limit } = parsePaginationParams(req);
      expect(limit).toBe(API_CONSTANTS.MAX_PAGE_SIZE);
    });

    it('should handle negative page numbers', () => {
      const req = { query: { page: '-5' } } as Request;
      const { page } = parsePaginationParams(req);
      expect(page).toBe(1);
    });
  });
});

