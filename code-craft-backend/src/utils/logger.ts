import winston from 'winston';
import { config } from '../config/env';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Helper function to filter sensitive data from logs
export const filterSensitiveData = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const filtered = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveFields = ['password', 'token', 'jwt', 'secret', 'authorization', 'cookie', 'session', 'creditcard', 'ssn', 'apikey', 'api_key'];
  
  Object.keys(filtered).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      filtered[key] = '[REDACTED]';
    } else if (typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  });
  
  return filtered;
};

// Custom format to filter sensitive data
const filterFormat = winston.format((info) => {
  return filterSensitiveData(info);
})();

// Define format for logs
const format = winston.format.combine(
  filterFormat,
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }) as any,
];

// Add file transport for production
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }) as any,
    new winston.transports.File({
      filename: config.logFile,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }) as any
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  format,
  transports,
});

// HTTP request logging middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }) as any,
  ],
});

// Request logging middleware for Express
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const requestId = req.requestId || 'unknown';
    const message = `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      userId: req.user?.id,
    };
    
    if (res.statusCode >= 400) {
      httpLogger.error(message, logData);
    } else {
      httpLogger.http(message, logData);
    }
  });
  
  next();
};

export default logger;