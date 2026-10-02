import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, HospitalSettings } from '../types';

interface AuthState {
  user: User | null;
  settings: HospitalSettings | null;
  isAuthenticated: boolean;
  loginTime: number | null;
  setUser: (user: User | null) => void;
  setSettings: (settings: HospitalSettings) => void;
  logout: () => void;
  checkSessionTimeout: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      settings: null,
      isAuthenticated: false,
      loginTime: null,

      setUser: (user) => set({ user, isAuthenticated: !!user, loginTime: user ? Date.now() : null }),

      setSettings: (settings) => set({ settings }),

      logout: () => {
        set({ user: null, isAuthenticated: false, loginTime: null });
      },

      checkSessionTimeout: () => {
        const { loginTime, settings } = get();
        if (!loginTime || !settings) return false;
        const timeoutMs = (settings.session_timeout_minutes || 60) * 60 * 1000;
        return Date.now() - loginTime > timeoutMs;
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => sessionStorage), // Session storage - clears on tab close
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        isAuthenticated: state.isAuthenticated,
        loginTime: state.loginTime,
      }),
    }
  )
);
