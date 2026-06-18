import { create } from "zustand";

interface UIStore {
  // Store Name Global State
  globalStoreName: string;
  setGlobalStoreName: (name: string) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Offline status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;

  // Global loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  // Store Name
  globalStoreName: "POS System",
  setGlobalStoreName: (name) => set({ globalStoreName: name }),

  // Sidebar
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Offline status
  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),
  
  pendingSyncCount: 0,
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  // Global loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
