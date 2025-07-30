'use client';

import axios, { AxiosInstance } from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL, API_ENDPOINTS, ERROR_CODES } from './constants';
import { validateUserId, validatePagination } from './validation';
import { 
  Snippet, 
  PaginatedResponse, 
  CreateSnippetRequest, 
  UpdateSnippetRequest, 
  PopularTagsResponse,
  ContributionGraphResponse 
} from '../types/api';

// Store CSRF token in memory
let csrfToken: string | null = null;

/**
 * Clear CSRF token from memory
 */
const clearCsrfToken = () => {
  csrfToken = null;
};

/**
 * Get CSRF token from memory or fetch it
 */
const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) {
    return csrfToken;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.CSRF_TOKEN}`, {
      withCredentials: true,
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    return null;
  }
};

/**
 * Create a configured Axios instance for API calls
 */
const createApiClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
    withCredentials: true, // Important: Include cookies in requests
  });

  // Request interceptor for logging and CSRF token
  api.interceptors.request.use(
    async (config) => {
      
      // Add CSRF token to headers for state-changing requests
      if (!['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')) {
        // Skip CSRF for the CSRF token endpoint itself
        if (!config.url?.includes('/csrf-token')) {
          const token = await getCsrfToken();
          if (token) {
            config.headers['x-csrf-token'] = token;
          } else {
            console.warn('No CSRF token available for request');
          }
        }
      }
      
      // Add Authorization header if token exists in localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle common errors
      if (error.response) {
        // Rate limiting
        if (error.response.status === ERROR_CODES.RATE_LIMITED) {
          toast.error('Rate limit exceeded. Please try again later.');
        }
        
        // Authentication errors
        if (error.response.status === ERROR_CODES.UNAUTHORIZED) {
          // Redirect to login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        // CSRF errors - clear token and retry might be needed
        if (error.response.status === 403 && error.response.data?.error?.message?.includes('CSRF')) {
          clearCsrfToken();
          console.warn('CSRF token error, cleared token for retry');
        }
        
        // Server errors
        if (error.response.status >= 500) {
          toast.error('Server error. Please try again later.');
        }
      } else if (error.request) {
        // Network errors
        toast.error('Network error. Please check your connection.');
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

// Create a singleton instance lazily to avoid SSR issues
let apiClientInstance: AxiosInstance | null = null;

export const apiClient: AxiosInstance = new Proxy({} as AxiosInstance, {
  get(target, prop, receiver) {
    if (!apiClientInstance) {
      apiClientInstance = createApiClient();
    }
    return Reflect.get(apiClientInstance, prop, receiver);
  },
});

/**
 * Auth API functions
 */
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    const { token, user } = response.data;
    // Store token in localStorage for tests
    if (token) {
      localStorage.setItem('token', token);
    }
    return { token, user };
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, { name, email, password });
    const { token, user } = response.data;
    // Store token in localStorage for tests
    if (token) {
      localStorage.setItem('token', token);
    }
    return { token, user };
  },
  
  logout: async () => {
    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    // Clear CSRF token
    clearCsrfToken();
    // Server will clear the httpOnly cookie
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
  
  getMe: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },
};

/**
 * User API functions
 */
export const userApi = {
  updateProfile: async (userData: { name?: string; bio?: string }) => {
    const response = await apiClient.patch(API_ENDPOINTS.USERS.UPDATE, userData);
    return response.data;
  },
  
  getContributionGraph: async (userId: string, startDate?: string, endDate?: string): Promise<ContributionGraphResponse> => {
    try {
      // Validate userId
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      // Validate dates if provided
      const params: any = {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        if (isNaN(startDateObj.getTime())) {
          throw new Error('Invalid start date format');
        }
        params.startDate = startDate;
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          throw new Error('Invalid end date format');
        }
        params.endDate = endDate;
      }

      // Make the API request with timeout
      const response = await apiClient.get(API_ENDPOINTS.USERS.CONTRIBUTION_GRAPH(userId), { 
        params,
        timeout: 15000 // 15 seconds for aggregation queries
      });

      // Validate response structure
      if (!response.data) {
        throw new Error('Invalid response: No data returned');
      }

      // Handle both {data: [...]} and direct array responses
      const responseData = response.data;
      if (responseData.data && Array.isArray(responseData.data)) {
        return responseData;
      } else if (Array.isArray(responseData)) {
        // If backend returns array directly, wrap it
        return { data: responseData, meta: {} };
      } else {
        console.error('Unexpected contribution graph response format:', responseData);
        // Return empty data to prevent crashes
        return { data: [], meta: {} };
      }
    } catch (error: any) {
      console.error('Error fetching contribution graph:', error);
      
      // Add more context to the error
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request parameters';
        throw new Error(`Validation error: ${errorMessage}`);
      }
      if (error.response?.status === 404) {
        throw new Error('User not found');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      
      throw error;
    }
  },
};

/**
 * Snippet API functions
 */
export const snippetApi = {
  getSnippets: async (params?: { 
    page?: number; 
    limit?: number; 
    language?: string; 
    search?: string;
    tags?: string[];
  }) => {
    const response = await apiClient.get(API_ENDPOINTS.SNIPPETS.BASE, { params });
    return response.data;
  },
  
  getSnippet: async (id: string) => {
    const response = await apiClient.get(API_ENDPOINTS.SNIPPETS.SINGLE(id));
    return response.data;
  },
  
  createSnippet: async (data: CreateSnippetRequest) => {
    const response = await apiClient.post(API_ENDPOINTS.SNIPPETS.BASE, data);
    return response.data;
  },
  
  updateSnippet: async (id: string, data: UpdateSnippetRequest) => {
    const response = await apiClient.put(API_ENDPOINTS.SNIPPETS.SINGLE(id), data);
    return response.data;
  },
  
  deleteSnippet: async (id: string) => {
    const response = await apiClient.delete(API_ENDPOINTS.SNIPPETS.SINGLE(id));
    return response.data;
  },
  
  getStarredSnippets: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(API_ENDPOINTS.SNIPPETS.STARRED, { params });
    return response.data;
  },

  getPopularTags: async (limit?: number): Promise<PopularTagsResponse> => {
    try {
      // Validate limit parameter
      const validLimit = limit && limit > 0 && limit <= 100 ? limit : 20;
      const params = { limit: validLimit };
      
      const response = await apiClient.get(API_ENDPOINTS.TAGS.POPULAR, { 
        params,
        timeout: 10000 // 10 seconds for tag aggregation
      });
      
      // Validate response structure
      if (!response.data) {
        console.error('Invalid popular tags response: No data');
        return { data: [], total: 0 };
      }
      
      const responseData = response.data;
      
      // Handle both {data: TagData[], total: number} and {tags: TagData[]} formats
      if (responseData.data && Array.isArray(responseData.data)) {
        // Validate each tag object
        const validatedData = responseData.data.filter((tag: any) => 
          tag && typeof tag.tag === 'string' && typeof tag.count === 'number'
        );
        return { 
          data: validatedData, 
          total: responseData.total || validatedData.length 
        };
      } else if (responseData.tags && Array.isArray(responseData.tags)) {
        // Handle legacy format
        const validatedTags = responseData.tags.filter((tag: any) => 
          tag && typeof tag.tag === 'string' && typeof tag.count === 'number'
        );
        return { 
          data: validatedTags, 
          total: validatedTags.length 
        };
      } else if (Array.isArray(responseData)) {
        // Handle direct array response
        const validatedArray = responseData.filter((tag: any) => 
          tag && typeof tag.tag === 'string' && typeof tag.count === 'number'
        );
        return { 
          data: validatedArray, 
          total: validatedArray.length 
        };
      } else {
        console.error('Unexpected popular tags response format:', responseData);
        return { data: [], total: 0 };
      }
    } catch (error: any) {
      console.error('Error fetching popular tags:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request parameters';
        throw new Error(`Validation error: ${errorMessage}`);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: Failed to fetch popular tags');
      }
      if (error.message === 'Network Error') {
        throw new Error('Network error: Please check your connection');
      }
      
      // Return empty data for other errors
      return { data: [], total: 0 };
    }
  },
};

/**
 * Comment API functions
 */
export const commentApi = {
  getComments: async (snippetId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(API_ENDPOINTS.COMMENTS.FOR_SNIPPET(snippetId), { params });
    return response.data;
  },
  
  createComment: async (snippetId: string, content: string) => {
    const response = await apiClient.post(API_ENDPOINTS.COMMENTS.FOR_SNIPPET(snippetId), { content });
    return response.data;
  },
  
  updateComment: async (commentId: string, content: string) => {
    const response = await apiClient.patch(API_ENDPOINTS.COMMENTS.SINGLE(commentId), { content });
    return response.data;
  },
  
  deleteComment: async (commentId: string) => {
    const response = await apiClient.delete(API_ENDPOINTS.COMMENTS.SINGLE(commentId));
    return response.data;
  },
  
  getMyComments: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(API_ENDPOINTS.COMMENTS.MY_COMMENTS, { params });
    return response.data;
  },
  
  // Threading support
  getThreadedComments: async (snippetId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(API_ENDPOINTS.COMMENTS.THREADED(snippetId), { params });
    return response.data;
  },
  
  createReply: async (snippetId: string, parentCommentId: string, content: string) => {
    const response = await apiClient.post(API_ENDPOINTS.COMMENTS.ADD_REPLY(snippetId, parentCommentId), { content });
    return response.data;
  },
  
  getReplies: async (commentId: string, page: number = 1, limit: number = 20) => {
    const response = await apiClient.get(API_ENDPOINTS.COMMENTS.GET_REPLIES(commentId), {
      params: { page, limit },
    });
    return response.data;
  },
  
  getCommentThread: async (commentId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.COMMENTS.THREAD(commentId));
    return response.data;
  },
};

/**
 * Star API functions
 */
export const starApi = {
  toggleStar: async (snippetId: string) => {
    const response = await apiClient.post(API_ENDPOINTS.STARS.TOGGLE(snippetId));
    return response.data;
  },
  
  getStarCount: async (snippetId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.STARS.COUNT(snippetId));
    return response.data;
  },
  
  checkIfStarred: async (snippetId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.STARS.CHECK(snippetId));
    return response.data;
  },
  
  getStarList: async (snippetId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.STARS.LIST(snippetId));
    return response.data;
  },
  
  getStarStats: async (snippetId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.STARS.STATS(snippetId));
    return response.data;
  },
};

/**
 * Execution API functions
 */
export const executionApi = {
  executeCode: async (language: string, code: string, input?: string) => {
    const response = await apiClient.post(API_ENDPOINTS.EXECUTIONS.BASE, { language, code, input });
    return response.data;
  },
  
  getLanguages: async () => {
    const response = await apiClient.get(API_ENDPOINTS.EXECUTIONS.LANGUAGES);
    return response.data;
  },
  
  getExecutions: async (params?: { page?: number; limit?: number; language?: string }) => {
    const response = await apiClient.get(API_ENDPOINTS.EXECUTIONS.BASE, { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await apiClient.get(API_ENDPOINTS.EXECUTIONS.STATS);
    return response.data;
  },
};

/**
 * Follow API functions
 */
export const followApi = {
  toggleFollow: async (userId: string) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const response = await apiClient.post(API_ENDPOINTS.FOLLOWS.TOGGLE(userId));
      return response.data;
    } catch (error) {
      console.error('Error toggling follow:', error);
      throw error;
    }
  },

  getFollowers: async (userId: string, page: number = 1, limit: number = 20) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const { page: validPage, limit: validLimit } = validatePagination(page, limit);

      const response = await apiClient.get(API_ENDPOINTS.FOLLOWS.FOLLOWERS(userId), {
        params: { page: validPage, limit: validLimit },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting followers:', error);
      throw error;
    }
  },

  getFollowing: async (userId: string, page: number = 1, limit: number = 20) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const { page: validPage, limit: validLimit } = validatePagination(page, limit);

      const response = await apiClient.get(API_ENDPOINTS.FOLLOWS.FOLLOWING(userId), {
        params: { page: validPage, limit: validLimit },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting following:', error);
      throw error;
    }
  },

  getFollowerCount: async (userId: string) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const response = await apiClient.get(API_ENDPOINTS.FOLLOWS.FOLLOWER_COUNT(userId));
      return response.data;
    } catch (error) {
      console.error('Error getting follower count:', error);
      throw error;
    }
  },

  getFollowingCount: async (userId: string) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const response = await apiClient.get(API_ENDPOINTS.FOLLOWS.FOLLOWING_COUNT(userId));
      return response.data;
    } catch (error) {
      console.error('Error getting following count:', error);
      throw error;
    }
  },

  checkFollowStatus: async (userId: string) => {
    try {
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid user ID');
      }

      const response = await apiClient.get(API_ENDPOINTS.FOLLOWS.CHECK(userId));
      return response.data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      throw error;
    }
  },
};

/**
 * User Search API functions
 */
export const userSearchApi = {
  searchUsers: async (query: string, page: number = 1, limit: number = 20) => {
    try {
      // Validate query
      if (!query || query.trim().length === 0) {
        return { users: [], total: 0, page, limit };
      }
      
      if (query.length > 100) {
        throw new Error('Query is too long');
      }

      const response = await apiClient.get(API_ENDPOINTS.USER_SEARCH.SEARCH, {
        params: { q: query.trim(), page, limit },
        timeout: 10000, // 10 seconds
      });

      // Validate response structure
      if (!response.data) {
        throw new Error('No response data received');
      }
      
      if (!response.data.users || !Array.isArray(response.data.users)) {
        console.warn('Unexpected response format, returning empty result');
        return { users: [], total: 0, page, limit };
      }

      return response.data;
    } catch (error: any) {
      // Handle specific errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 400) {
          throw new Error(`Validation error: ${message}`);
        } else if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          throw new Error(`Rate limit exceeded. Please try again in ${retryAfter || 'a few'} seconds.`);
        } else if (status === 500) {
          throw new Error('Server error. Please try again later.');
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your internet connection.');
      }

      console.error('searchUsers error:', error);
      throw new Error(error.message || 'Failed to search users');
    }
  },
  
  getPopularUsers: async (page: number = 1, limit: number = 20) => {
    try {
      const { page: validPage, limit: validLimit } = validatePagination(page, limit);
      
      const response = await apiClient.get(API_ENDPOINTS.USER_SEARCH.POPULAR, {
        params: { page: validPage, limit: validLimit },
        timeout: 10000,
      });
      
      if (!response.data || !Array.isArray(response.data.users)) {
        console.warn('Unexpected response format for popular users');
        return { users: [], total: 0, page: validPage, limit: validLimit };
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getPopularUsers error:', error);
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error(error.message || 'Failed to fetch popular users');
    }
  },
  
  getRecentUsers: async (page: number = 1, limit: number = 20) => {
    try {
      const { page: validPage, limit: validLimit } = validatePagination(page, limit);
      
      const response = await apiClient.get(API_ENDPOINTS.USER_SEARCH.RECENT, {
        params: { page: validPage, limit: validLimit },
        timeout: 10000,
      });
      
      if (!response.data || !Array.isArray(response.data.users)) {
        console.warn('Unexpected response format for recent users');
        return { users: [], total: 0, page: validPage, limit: validLimit };
      }
      
      return response.data;
    } catch (error: any) {
      console.error('getRecentUsers error:', error);
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      throw new Error(error.message || 'Failed to fetch recent users');
    }
  },
};

/**
 * User Profile API functions
 */
export const userProfileApi = {
  getUserProfile: async (userId: string) => {
    const response = await apiClient.get(API_ENDPOINTS.USER_PROFILE.PUBLIC(userId));
    return response.data;
  },
};

/**
 * Notification API functions
 */
export const notificationApi = {
  listNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params });
    return response.data;
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data;
  },
  
  markAllNotificationsRead: async () => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data;
  },
};
