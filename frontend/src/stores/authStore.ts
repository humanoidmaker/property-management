import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('rf_token'),
  user: JSON.parse(localStorage.getItem('rf_user') || 'null'),

  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('rf_token', token);
    localStorage.setItem('rf_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('rf_token');
    localStorage.removeItem('rf_user');
    set({ token: null, user: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('rf_token');
    const user = JSON.parse(localStorage.getItem('rf_user') || 'null');
    set({ token, user });
  },
}));
