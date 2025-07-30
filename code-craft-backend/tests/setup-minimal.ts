// Minimal setup for unit tests that don't require database connection

// Mock environment validation
jest.mock('../src/config/env', () => {
  const originalModule = jest.requireActual('../src/config/env');
  
  // Override the config with test values
  const testConfig = {
    port: 3001,
    nodeEnv: 'test',
    mongodbUri: 'mongodb://localhost:27017/test',
    jwtSecret: 'this_is_a_test_secret_key_that_is_at_least_32_characters_long',
    jwtExpiresIn: '1h',
    corsOrigin: 'http://localhost:3000',
    logLevel: 'error',
    logFile: 'logs/test.log',
    cookieDomain: undefined,
    secureCookies: false
  };
  
  return {
    ...originalModule,
    config: testConfig,
  };
});

// Mock logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: jest.fn((req, res, next) => next()),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'this_is_a_test_secret_key_that_is_at_least_32_characters_long';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
