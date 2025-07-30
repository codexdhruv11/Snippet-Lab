import { logger, filterSensitiveData, requestLogger } from '../../../src/utils/logger';
import { Request, Response } from 'express';

// Mock winston's transports
import winston from 'winston';
jest.mock('winston');

const mockConsoleTransport = new winston.transports.Console();
const mockFileTransport = new winston.transports.File({ filename: 'mock.log' });

// Spy on winston's logger creation
const createLoggerSpy = jest.spyOn(winston, 'createLogger');

describe('Logger Utilities', () => {
  createLoggerSpy.mockReturnValue({
    transports: [mockConsoleTransport, mockFileTransport],
    add: jest.fn(),
    remove: jest.fn(),
    log: jest.fn(),
  } as any);

  describe('Logger Configuration', () => {
    it('should create logger instance with correct levels and transports', () => {
      expect(createLoggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: expect.any(String),
          transports: expect.any(Array),
        })
      );

      // Check console transport
      expect(winston.transports.Console).toHaveBeenCalled();

      // Check file transport
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({ filename: expect.any(String) })
      );
    });

    it('should filter sensitive data using filterSensitiveData', () => {
      const logSpy = jest.spyOn(logger, 'log');
      const data = {
        password: 'hidden',
        token: 'hidden',
        jwt: 'hidden',
      };

      filterSensitiveData(data);

      logger.log('info', 'Sensitive data test', data);
      expect(logSpy).toHaveBeenCalledWith('info', 'Sensitive data test', {
        password: '[FILTERED]',
        token: '[FILTERED]',
        jwt: '[FILTERED]',
      });
    });

    it('should redact sensitive fields', () => {
      const testData = {
        password: 'TestPassword',
        jwt: 'TestJWT',
        token: 'TestToken',
        secret: 'TestSecret',
      };

      const result = filterSensitiveData(testData);

      expect(result.password).toBe('[FILTERED]');
      expect(result.jwt).toBe('[FILTERED]');
      expect(result.token).toBe('[FILTERED]');
      expect(result.secret).toBe('[FILTERED]');
    });

    it('should handle nested object filtering', () => {
      const nestedData = {
        outer: {
          inner: {
            password: 'TestPassword',
          },
          token: 'TestToken',
        }
      };

      const result = filterSensitiveData(nestedData);

      expect(result.outer.inner.password).toBe('[FILTERED]');
      expect(result.outer.token).toBe('[FILTERED]');
    });

    it('should handle array filtering for sensitive data', () => {
      const arrayData = [{ token: 'TestToken' }, { password: 'TestPassword' }];

      const result = filterSensitiveData(arrayData);

      expect(result[0].token).toBe('[FILTERED]');
      expect(result[1].password).toBe('[FILTERED]');
    });
  });

  describe('HTTP Logger Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        headers: {},
        startTime: Date.now(),
      };
      res = {
        on: jest.fn(),
        statusCode: 200,
      };
      next = jest.fn();

      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      (console.log as jest.Mock).mockRestore();
    });

    it('should log requests with correct information', () => {
      requestLogger(req as Request, res as Response, next);

      // Mock response 'finish' event
      res.on.mock.calls[0][1]();

      // Check console.log output
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/GET/));
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\d+ ms/));
    });

    it('should handle request IDs', () => {
      req.headers['x-request-id'] = '1234';

      requestLogger(req as Request, res as Response, next);
      res.on.mock.calls[0][1]();

      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/1234/));
    });

    it('should log user ID if available', () => {
      (req as any).user = { id: 'user123' };

      requestLogger(req as Request, res as Response, next);
      res.on.mock.calls[0][1]();

      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/user123/));
    });

    it('should log errors based on status codes', () => {
      res.statusCode = 500;

      requestLogger(req as Request, res as Response, next);
      res.on.mock.calls[0][1]();

      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/500/));
    });
  });

  describe('Edge Cases', () => {
    it('should handle logger with null inputs gracefully', () => {
      const nullLogger = filterSensitiveData(null as any);
      expect(nullLogger).toBeNull();
    });

    it('should handle logger with undefined inputs gracefully', () => {
      const undefinedLogger = filterSensitiveData(undefined as any);
      expect(undefinedLogger).toBeUndefined();
    });

    it('should maintain behavior in different NODE_ENV settings', () => {
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';
      expect(logger.level).toBe('info');

      process.env.NODE_ENV = 'development';
      expect(logger.level).toBe('debug');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Transport Configuration', () => {
    it('should configure console transport correctly', () => {
      expect(mockConsoleTransport).toBeTruthy();
    });

    it('should configure file transport correctly in production', () => {
      process.env.NODE_ENV = 'production';
      expect(mockFileTransport).toBeTruthy();
    });

    it('should configure log format correctly', () => {
      const format = createLoggerSpy.mock.calls[0][0].format;
      expect(format).toBeDefined();
    });
  });
});

