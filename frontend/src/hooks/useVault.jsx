import { useState, useCallback } from 'react';
import { api } from '../utils/api.js';
import { encryptEntry, decryptEntry } from '../utils/crypto.js';
import { useAuth } from './useAuth.jsx';

export function useVault() {
  const { masterKey } = useAuth();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // -- Fetch & decrypt all vault entries ------------------------------------
  const fetchVault = useCallback(async () => {
    if (!masterKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/passwords');
      const decrypted = await Promise.all(
        data.entries.map(async (entry) => {
          try {
            const payload = await decryptEntry(masterKey, {
              encryptedData: entry.encryptedData,
              iv: entry.iv,
              authTag: entry.authTag,
            });
            return { ...entry, decrypted: payload };
          } catch {
            return { ...entry, decrypted: { password: '', error: true } };
          }
        })
      );
      setEntries(decrypted);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  }, [masterKey]);

  // -- Add new entry --------------------------------------------------------
  const addEntry = useCallback(
    async (payload) => {
      if (!masterKey) return;
      setError(null);
      try {
        const encrypted = await encryptEntry(masterKey, {
          password: payload.password,
        });
        const { data } = await api.post('/passwords', {
          site: payload.site,
          username: payload.username,
          category: payload.category || 'login',
          isFavourite: payload.isFavourite || false,
          ...encrypted,
        });
        // Decrypt for local state
        const decrypted = await decryptEntry(masterKey, {
          encryptedData: data.encryptedData,
          iv: data.iv,
          authTag: data.authTag,
        });
        setEntries((prev) => [{ ...data, decrypted }, ...prev]);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to add entry');
        throw err;
      }
    },
    [masterKey]
  );

  // -- Update entry ---------------------------------------------------------
  const updateEntry = useCallback(
    async (id, payload) => {
      if (!masterKey) return;
      setError(null);
      try {
        const encrypted = await encryptEntry(masterKey, {
          password: payload.password,
        });
        const { data } = await api.put(`/passwords/${id}`, {
          site: payload.site,
          username: payload.username,
          category: payload.category || 'login',
          isFavourite: payload.isFavourite || false,
          ...encrypted,
        });
        const decrypted = await decryptEntry(masterKey, {
          encryptedData: data.encryptedData,
          iv: data.iv,
          authTag: data.authTag,
        });
        setEntries((prev) =>
          prev.map((e) => (e._id === id ? { ...data, decrypted } : e))
        );
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update entry');
        throw err;
      }
    },
    [masterKey]
  );

  // -- Delete entry ---------------------------------------------------------
  const deleteEntry = useCallback(async (id) => {
    setError(null);
    try {
      await api.delete(`/passwords/${id}`);
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete entry');
      throw err;
    }
  }, []);

  return {
    entries,
    isLoading,
    error,
    fetchVault,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
