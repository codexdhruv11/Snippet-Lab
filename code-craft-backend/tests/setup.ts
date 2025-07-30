import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';

// Mock external services
jest.mock('../src/services/codeExecution', () => ({
  codeExecutionService: {
    executeCode: jest.fn(),
    getSupportedLanguages: jest.fn(),
    validateLanguage: jest.fn(),
    getLanguageConfig: jest.fn(),
  },
}));

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

// Mock Piston API
jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn(),
}));

let mongoServer: MongoMemoryServer;

// Increase Jest timeout for all tests
jest.setTimeout(60000); // 60 seconds

// Database connection functions for tests
export const connectTestDatabase = async () => {
  try {
    // Set environment variable to skip MD5 check
    process.env.MONGOMS_SKIP_MD5_CHECK = '1';
    process.env.MONGOMS_DOWNLOAD_DIR = './.mongo-binaries';
    process.env.MONGOMS_VERSION = '5.0.5';
    
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test',
        port: 27018, // Use a different port to avoid conflicts
        storageEngine: 'wiredTiger',
      },
    });
    
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increase timeout for server selection
      socketTimeoutMS: 30000, // Increase socket timeout
      connectTimeoutMS: 30000, // Increase connection timeout
    });
    
    console.log('Connected to in-memory MongoDB instance');
  } catch (error) {
    console.error('Failed to start MongoDB memory server:', error);
    throw error;
  }
};

export const clearTestDatabase = async () => {
  if (!mongoose.connection || !mongoose.connection.db) {
    console.warn('No database connection to clear');
    return;
  }
  
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const closeTestDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error closing test database:', error);
  }
};

// Global test setup
beforeAll(async () => {
  try {
    // Start in-memory MongoDB instance
    await connectTestDatabase();
  } catch (error) {
    console.error('Error in global test setup:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all collections
    await clearTestDatabase();
    
    // Clear all mocks
    jest.clearAllMocks();
  } catch (error) {
    console.error('Error in afterEach cleanup:', error);
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Close database connection
    await closeTestDatabase();
  } catch (error) {
    console.error('Error in global test teardown:', error);
  }
});

// Helper functions for tests

// Create a test user
export const createTestUser = async (userData = {}) => {
  const { User } = require('../src/models');
  const defaultData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123',
  };
  
  const user = new User({ ...defaultData, ...userData });
  await user.save();
  return user;
};

// Create a test snippet
export const createTestSnippet = async (userId: any, snippetData = {}) => {
  const { Snippet } = require('../src/models');
  const defaultData = {
    userId,
    title: 'Test Snippet',
    language: 'javascript',
    code: 'console.log("Hello, World!");',
    description: 'Test description',
    userName: 'Test User',
    isPublic: true,
  };
  
  const snippet = new Snippet({ ...defaultData, ...snippetData });
  await snippet.save();
  return snippet;
};

// Create a test comment
export const createTestComment = async (userId: any, snippetId: any, commentData = {}) => {
  const { SnippetComment } = require('../src/models');
  const defaultData = {
    userId,
    snippetId,
    content: 'Test comment',
    userName: 'Test User',
  };
  
  const comment = new SnippetComment({ ...defaultData, ...commentData });
  await comment.save();
  return comment;
};

// Generate a test JWT token
export const generateTestJWT = (userId: string) => {
  return jwt.sign({ id: userId }, 'this_is_a_test_secret_key_that_is_at_least_32_characters_long', { expiresIn: '1h' });
};

// Mock authenticated user for tests
export const mockAuthUser = (req: any, userId: string) => {
  req.user = { id: userId };
  return req;
};

// Mock Piston API responses
export const mockPistonSuccess = {
  ran: true,
  language: 'javascript',
  version: '18.15.0',
  output: 'Hello, World!\n',
  stdout: 'Hello, World!\n',
  stderr: '',
  code: 0,
  signal: null,
};

export const mockPistonError = {
  ran: true,
  language: 'javascript',
  version: '18.15.0',
  output: 'Error: Unexpected token\n',
  stdout: '',
  stderr: 'Error: Unexpected token\n',
  code: 1,
  signal: null,
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'this_is_a_test_secret_key_that_is_at_least_32_characters_long';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';