import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/api';
import { authApi } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewUser: boolean;
  
  // Actions
  login: (token: string, user: User, isNewUser?: boolean) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  updateUserData: (userData: Partial<User>) => void;
  clearNewUserFlag: () => void;
  
  // New methods for complete auth flow
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithCredentials: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false, // Start with false to prevent infinite loading
      error: null,
      isNewUser: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUserData: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
      
      clearNewUserFlag: () => set({ isNewUser: false }),
      
      login: (token, user, isNewUser = false) => {
        // Store token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        
        set({
          token,
          user,
          isAuthenticated: true,
          error: null,
          isNewUser,
        });
      },
      
      logout: () => {
        // Remove token from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isNewUser: false,
        });
      },
      
      checkAuth: async () => {
        try {
          // Check auth by calling the /me endpoint
          const userData = await authApi.getMe();
          set({ 
            user: userData.user, 
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      // Complete auth flow methods
      loginWithCredentials: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const { token, user } = await authApi.login(email, password);
          
          get().login(token, user, false); // false for returning users
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          console.error('Login error details:', error);
          let errorMessage = 'Login failed';
          
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
            errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Login failed';
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      registerWithCredentials: async (name: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const { token, user } = await authApi.register(name, email, password);
          
          get().login(token, user, true); // true for new users
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        
        try {
          // Get token from localStorage
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          
          if (!token) {
            throw new Error('No token found');
          }
          
          // Check if user is authenticated by calling the /me endpoint
          const userData = await authApi.getMe();
          set({ 
            token,
            user: userData.user, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          // User is not authenticated
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          
          set({ 
            token: null,
            isLoading: false, 
            isAuthenticated: false,
            user: null
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: true,
      // Prevent hydration mismatch by using a specific storage config
      getStorage: () => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      },
    }
  )
); 