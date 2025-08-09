import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  SearchState, 
  SearchResult, 
  SearchFilters, 
  SearchHistoryItem, 
  SearchSuggestion 
} from '@/types/search';

interface SearchStore extends SearchState {
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setResults: (results: SearchResult[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setCurrentPage: (page: number) => void;
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  setActiveIndex: (index: number) => void;
  
  // History actions
  addToHistory: (item: SearchHistoryItem) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // Reset actions
  resetSearch: () => void;
  clearResults: () => void;
}

const initialState: SearchState = {
  query: '',
  filters: { scope: 'all' },
  results: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  currentPage: 1,
  suggestions: [],
  history: [],
  activeIndex: -1,
};

export const useSearchStore = create<SearchStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // Basic setters
        setQuery: (query) => set({ query }),
        setFilters: (filters) => set({ filters }),
        setResults: (results) => set({ results }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setTotalCount: (totalCount) => set({ totalCount }),
        setHasMore: (hasMore) => set({ hasMore }),
        setCurrentPage: (currentPage) => set({ currentPage }),
        setSuggestions: (suggestions) => set({ suggestions }),
        setActiveIndex: (activeIndex) => set({ activeIndex }),
        
        // History actions
        addToHistory: (item) =>
          set((state) => ({
            history: [item, ...state.history.filter((h) => h.id !== item.id)].slice(0, 20),
          })),
          
        removeFromHistory: (id) =>
          set((state) => ({
            history: state.history.filter((item) => item.id !== id),
          })),
          
        clearHistory: () => set({ history: [] }),
        
        // Reset actions
        resetSearch: () => set(initialState),
        clearResults: () => set({ results: [], totalCount: 0, hasMore: false }),
      }),
      {
        name: 'search-store',
        partialize: (state) => ({ history: state.history }), // Only persist history
      }
    )
  )
);
