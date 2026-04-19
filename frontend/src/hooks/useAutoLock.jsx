import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth.jsx';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'vaultAutoLockMinutes';

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click',
];

/**
 * Auto-lock hook — logs user out after inactivity.
 * Returns { timeoutMinutes, setTimeoutMinutes, remaining }
 */
export function useAutoLock() {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [remaining, setRemaining] = useState(null);

  // Read saved timeout preference
  const [timeoutMinutes, setTimeoutMinutesState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 5;
  });

  const timeoutMs = timeoutMinutes * 60 * 1000;

  const setTimeoutMinutes = useCallback((mins) => {
    setTimeoutMinutesState(mins);
    localStorage.setItem(STORAGE_KEY, String(mins));
    lastActivityRef.current = Date.now(); // reset timer on change
  }, []);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || timeoutMinutes === 0) {
      setRemaining(null);
      return;
    }

    // Listen for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    // Also reset on visibility change (user returns to tab)
    const handleVisibility = () => {
      if (!document.hidden) resetActivity();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Check every second
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const left = Math.max(0, timeoutMs - elapsed);
      setRemaining(Math.ceil(left / 1000));

      if (left <= 0) {
        clearInterval(interval);
        logout();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, timeoutMs, timeoutMinutes, resetActivity, logout]);

  // Clear clipboard on lock (wipe sensitive data)
  useEffect(() => {
    if (!isAuthenticated) {
      navigator.clipboard.writeText('').catch(() => {});
    }
  }, [isAuthenticated]);

  return { timeoutMinutes, setTimeoutMinutes, remaining };
}
