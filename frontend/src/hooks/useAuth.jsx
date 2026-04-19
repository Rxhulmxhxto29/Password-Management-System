import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import {
  generateSalt,
  deriveMasterKey,
  deriveAuthKey,
} from '../utils/crypto.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem('accessToken') || null
  );
  const [user, setUser] = useState(
    () => {
      const u = localStorage.getItem('vaultUser');
      return u ? JSON.parse(u) : null;
    }
  );
  // Master key lives in React state ONLY — never persisted
  const [masterKey, setMasterKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // TOTP: temporary token + pending credentials for 2FA flow
  const [tempToken, setTempToken] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const navigate = useNavigate();

  const isAuthenticated = !!accessToken;
  const requiresTOTP = !!tempToken;

  // -- Login ---------------------------------------------------------------
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      // 1. Get salt (returns fake salt for unknown users — anti-enumeration)
      const { data: saltData } = await api.get(`/auth/salt/${username}`);
      const salt = saltData.salt;

      // 2. Derive auth key (separate from master key)
      const authKey = await deriveAuthKey(password, salt);

      // 3. Authenticate with server
      const { data } = await api.post('/auth/login', { username, authKey });

      // 3a. If 2FA is required, store temp token and redirect to challenge
      if (data.requiresTOTP) {
        setTempToken(data.tempToken);
        setPendingCredentials({ username, password, salt });
        return { success: true, requiresTOTP: true };
      }

      // 4. Store access token
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('vaultUser', JSON.stringify({ username }));
      setAccessToken(data.accessToken);
      setUser({ username });

      // 5. Derive master key (stays in memory only)
      const key = await deriveMasterKey(password, salt);
      setMasterKey(key);

      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // -- Verify TOTP (second step of 2FA login) ------------------------------
  const verifyTOTP = useCallback(async (code) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/totp/authenticate', {
        tempToken,
        token: code,
      });

      // Store access token
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('vaultUser', JSON.stringify({ username: pendingCredentials.username }));
      setAccessToken(data.accessToken);
      setUser({ username: pendingCredentials.username });

      // Derive master key from pending credentials
      const key = await deriveMasterKey(
        pendingCredentials.password,
        pendingCredentials.salt
      );
      setMasterKey(key);

      // Clear TOTP state
      setTempToken(null);
      setPendingCredentials(null);

      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [tempToken, pendingCredentials]);

  // -- Register ------------------------------------------------------------
  const register = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      // 1. Generate random salt
      const salt = generateSalt();

      // 2. Derive auth key
      const authKey = await deriveAuthKey(password, salt);

      // 3. Register on server (server stores bcrypt hash of authKey)
      await api.post('/auth/register', { username, authKey, salt });

      // 4. Auto-login after registration
      return await login(username, password);
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // -- Logout --------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — we're logging out regardless
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('vaultUser');
    setAccessToken(null);
    setUser(null);
    setMasterKey(null); // Clear encryption key from memory
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        masterKey,
        isLoading,
        isAuthenticated,
        login,
        verifyTOTP,
        requiresTOTP,
        register,
        logout,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
