import { useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from './useAuth.jsx';

/**
 * Silently refreshes the access token every 12 minutes.
 * Access token expires at 15 min — this refreshes 3 min before expiry.
 * On failure, triggers logout to clear master key from memory.
 */
export function useTokenRefresh() {
  const { isAuthenticated, setAccessToken, logout } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', data.accessToken);
        setAccessToken(data.accessToken);
      } catch {
        logout();
      }
    };

    // Refresh every 12 minutes (720,000 ms)
    intervalRef.current = setInterval(refresh, 12 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, setAccessToken, logout]);
}
