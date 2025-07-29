import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  // Mobile navigation
  activeTab: 'editor' | 'snippets' | 'profile' | 'more';
  setActiveTab: (tab: UIState['activeTab']) => void;
  
  // Execution panel
  isExecutionPanelOpen: boolean;
  setExecutionPanelOpen: (open: boolean) => void;
  toggleExecutionPanel: () => void;
  
  // Animation preferences
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      isSidebarOpen: true,
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      // Mobile navigation
      activeTab: 'editor',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Execution panel
      isExecutionPanelOpen: true,
      setExecutionPanelOpen: (open) => set({ isExecutionPanelOpen: open }),
      toggleExecutionPanel: () => set((state) => ({ isExecutionPanelOpen: !state.isExecutionPanelOpen })),
      
      // Animation preferences
      reducedMotion: false,
      setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        reducedMotion: state.reducedMotion,
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