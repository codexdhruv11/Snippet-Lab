import { getCookieOptions, setAuthCookie, clearAuthCookie, setCsrfCookie } from '../../../src/utils/cookies';
import { config } from '../../../src/config/env';
import { Response } from 'express';
import ms from 'ms';

// Mock config
jest.mock('../../../src/config/env');

// Mock ms module
jest.mock('ms');

describe('Cookie Utilities', () => {
  let mockRes: Partial<Response>;
  let mockCookie: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock response
    mockCookie = jest.fn().mockReturnThis();
    mockRes = {
      cookie: mockCookie,
    } as Partial<Response>;

    // Default config mock
    (config as jest.Mocked<typeof config>).isProduction = false;
    (config as jest.Mocked<typeof config>).secureCookies = false;
    (config as jest.Mocked<typeof config>).cookieDomain = undefined;
    (config as jest.Mocked<typeof config>).jwtExpiresIn = '7d';

    // Mock ms function
    (ms as jest.Mock).mockReturnValue(7 * 24 * 60 * 60 * 1000); // 7 days in ms
  });

  describe('getCookieOptions()', () => {
    it('should return correct options for development environment', () => {
      const options = getCookieOptions();

      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });

    it('should return correct options for production environment', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;
      (config as jest.Mocked<typeof config>).cookieDomain = 'example.com';

      const options = getCookieOptions();

      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: 'example.com',
      });
    });

    it('should respect secureCookies config even in development', () => {
      (config as jest.Mocked<typeof config>).isProduction = false;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      const options = getCookieOptions();

      expect(options.secure).toBe(true);
    });

    it('should not include domain when cookieDomain is undefined', () => {
      (config as jest.Mocked<typeof config>).cookieDomain = undefined;

      const options = getCookieOptions();

      expect(options.domain).toBeUndefined();
    });

    it('should parse JWT expiration correctly with ms()', () => {
      (config as jest.Mocked<typeof config>).jwtExpiresIn = '30d';
      (ms as jest.Mock).mockReturnValue(30 * 24 * 60 * 60 * 1000);

      const options = getCookieOptions();

      expect(ms).toHaveBeenCalledWith('30d');
      expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should handle custom httpOnly option', () => {
      const options = getCookieOptions(false);

      expect(options.httpOnly).toBe(false);
    });
  });

  describe('setAuthCookie()', () => {
    it('should set auth cookie with development settings', () => {
      const token = 'test-token';

      setAuthCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith('auth', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });

    it('should set auth cookie with production settings and secure cookies', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      const token = 'test-token';

      setAuthCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith('auth', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });

    it('should use __Host- prefix in production with secure cookies', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      const token = 'test-token';

      setAuthCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        '__Host-auth',
        token,
        expect.objectContaining({
          secure: true,
          path: '/',
        })
      );
    });

    it('should not use __Host- prefix in development', () => {
      (config as jest.Mocked<typeof config>).isProduction = false;

      const token = 'test-token';

      setAuthCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        'auth',
        token,
        expect.any(Object)
      );
    });

    it('should not include domain when using __Host- prefix', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;
      (config as jest.Mocked<typeof config>).cookieDomain = 'example.com';

      const token = 'test-token';

      setAuthCookie(mockRes as Response, token);

      const cookieOptions = mockCookie.mock.calls[0][2];
      expect(cookieOptions.domain).toBeUndefined();
      expect(cookieOptions.path).toBe('/');
    });
  });

  describe('clearAuthCookie()', () => {
    it('should clear auth cookie by setting maxAge to 0', () => {
      clearAuthCookie(mockRes as Response);

      expect(mockCookie).toHaveBeenCalledWith(
        'auth',
        '',
        expect.objectContaining({
          maxAge: 0,
        })
      );
    });

    it('should use same cookie name as setAuthCookie in production', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      clearAuthCookie(mockRes as Response);

      expect(mockCookie).toHaveBeenCalledWith(
        '__Host-auth',
        '',
        expect.objectContaining({
          maxAge: 0,
          secure: true,
        })
      );
    });

    it('should maintain all cookie options except maxAge', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      clearAuthCookie(mockRes as Response);

      expect(mockCookie).toHaveBeenCalledWith(
        '__Host-auth',
        '',
        {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 0,
          path: '/',
        }
      );
    });
  });

  describe('setCsrfCookie()', () => {
    it('should set CSRF cookie with httpOnly false', () => {
      const token = 'csrf-token';

      setCsrfCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        'csrf',
        token,
        expect.objectContaining({
          httpOnly: false,
        })
      );
    });

    it('should set CSRF cookie with different environment configurations', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      const token = 'csrf-token';

      setCsrfCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        'csrf',
        token,
        {
          httpOnly: false,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }
      );
    });

    it('should handle domain in CSRF cookie for production', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).cookieDomain = 'example.com';

      const token = 'csrf-token';

      setCsrfCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        'csrf',
        token,
        expect.objectContaining({
          domain: 'example.com',
        })
      );
    });

    it('should not use __Host- prefix for CSRF cookie', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;

      const token = 'csrf-token';

      setCsrfCookie(mockRes as Response, token);

      expect(mockCookie).toHaveBeenCalledWith(
        'csrf', // No __Host- prefix
        token,
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle __Host- prefix requirements correctly', () => {
      (config as jest.Mocked<typeof config>).isProduction = true;
      (config as jest.Mocked<typeof config>).secureCookies = true;
      (config as jest.Mocked<typeof config>).cookieDomain = 'example.com';

      setAuthCookie(mockRes as Response, 'token');

      const cookieOptions = mockCookie.mock.calls[0][2];
      
      // __Host- requirements: secure, path=/, no domain
      expect(cookieOptions.secure).toBe(true);
      expect(cookieOptions.path).toBe('/');
      expect(cookieOptions.domain).toBeUndefined();
    });

    it('should handle undefined config values gracefully', () => {
      (config as jest.Mocked<typeof config>).jwtExpiresIn = undefined as any;
      (ms as jest.Mock).mockReturnValue(undefined);

      const options = getCookieOptions();

      expect(options.maxAge).toBeUndefined();
    });

    it('should use different sameSite values based on environment', () => {
      // Development
      (config as jest.Mocked<typeof config>).isProduction = false;
      let options = getCookieOptions();
      expect(options.sameSite).toBe('lax');

      // Production
      (config as jest.Mocked<typeof config>).isProduction = true;
      options = getCookieOptions();
      expect(options.sameSite).toBe('strict');
    });

    it('should handle ms() returning different duration formats', () => {
      const testCases = [
        { input: '1h', output: 60 * 60 * 1000 },
        { input: '24h', output: 24 * 60 * 60 * 1000 },
        { input: '1d', output: 24 * 60 * 60 * 1000 },
        { input: '1w', output: 7 * 24 * 60 * 60 * 1000 },
      ];

      testCases.forEach(({ input, output }) => {
        (config as jest.Mocked<typeof config>).jwtExpiresIn = input;
        (ms as jest.Mock).mockReturnValue(output);

        const options = getCookieOptions();
        
        expect(ms).toHaveBeenCalledWith(input);
        expect(options.maxAge).toBe(output);
      });
    });
  });
});
