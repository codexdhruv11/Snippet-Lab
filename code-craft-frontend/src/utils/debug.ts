// Debug utilities for development
export const debugLog = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, data);
  }
};

export const debugError = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
};
