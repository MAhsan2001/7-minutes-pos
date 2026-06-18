import { create } from "zustand";
import type { Profile, UserRole } from "@/lib/types";

interface AuthStore {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // Actions
  setUser: (user: any | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  
  // Computed helpers
  getRole: () => UserRole | undefined;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),

  getRole: () => get().profile?.role,
  isAuthenticated: () => !!get().user,
}));
