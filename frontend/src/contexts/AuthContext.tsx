/**
 * Auth Context Provider (V-7, V-9)
 *
 * Manages JWT authentication state across the application.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'klaus_news_token';
const TOKEN_EXPIRY_KEY = 'klaus_news_token_expiry';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (expiryDate > new Date()) {
        setToken(storedToken);
        // Verify token with backend
        verifyToken(storedToken);
      } else {
        // Token expired, clear storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokenToVerify}` }
      });
      if (response.data.authenticated) {
        setToken(tokenToVerify);
        setUsername(response.data.username);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameInput: string, password: string) => {
    const response = await apiClient.post('/auth/login', {
      username: usernameInput,
      password
    });

    const { token: newToken, expires_at } = response.data;

    // Store in localStorage (V-7)
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expires_at);

    setToken(newToken);
    setUsername(usernameInput);
  };

  const logout = () => {
    // V-9: Clear session
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setToken(null);
    setUsername(null);
    // Redirect handled by ProtectedRoute
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        username,
        token,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
