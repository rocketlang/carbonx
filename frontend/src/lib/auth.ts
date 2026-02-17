import { create } from 'zustand';
import { apolloClient } from './apollo.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const TOKEN_KEY = 'carbonx_token';
const USER_KEY  = 'carbonx_user';

function loadFromStorage(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    const user  = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

const initial = loadFromStorage();

export const useAuth = create<AuthStore>((set) => ({
  token:           initial.token,
  user:            initial.user,
  isAuthenticated: !!initial.token,

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY,  JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    apolloClient.clearStore();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
