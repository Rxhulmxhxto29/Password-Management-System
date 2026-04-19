import { useState, useRef } from 'react';
import {
  Download, Upload, Loader2, X, Check, AlertTriangle, FileJson, Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { encryptEntry, decryptEntry, deriveMasterKey, generateSalt } from '../utils/crypto.js';

/**
 * Encrypted Export/Import — Zero-knowledge vault backup.
 * Exports: JSON envelope with re-encrypted entries using an export password.
 * Imports: Decrypts with export password, re-encrypts with current master key.
 */
export default function ExportImport({ entries, onImport, onClose }) {
  const { masterKey } = useAuth();
  const [tab, setTab] = useState('export');
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileRef = useRef(null);

  // -- EXPORT ---------------------------------------------------------------
  const handleExport = async () => {
    if (!exportPassword || exportPassword.length < 8) {
      setError('Export password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Derive export key from the export password
      const exportSalt = generateSalt();
      const exportKey = await deriveMasterKey(exportPassword, exportSalt);

      // Re-encrypt each entry with the export key
      const exportedEntries = [];
      for (const entry of entries) {
        if (!entry.decrypted) continue;

        // Build a clean plaintext object
        const plaintext = {
          site: entry.site,
          username: entry.username,
          category: entry.category,
          ...entry.decrypted, // password, notes, etc.
        };

        const encrypted = await encryptEntry(exportKey, plaintext);
        exportedEntries.push(encrypted);
      }

      const envelope = {
        format: 'secure-vault-export',
        version: 1,
        exportSalt,
        createdAt: new Date().toISOString(),
        entryCount: exportedEntries.length,
        entries: exportedEntries,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(envelope, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secure-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess(`Exported ${exportedEntries.length} entries`);
    } catch (err) {
      setError('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // -- FILE SELECT ----------------------------------------------------------
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.format !== 'secure-vault-export' || !data.entries?.length) {
          setError('Invalid export file format');
          return;
        }
        setImportFile(data);
        setImportPreview(`${data.entryCount} entries — exported ${new Date(data.createdAt).toLocaleDateString()}`);
      } catch {
        setError('Could not parse the file');
      }
    };
    reader.readAsText(file);
  };

  // -- IMPORT ---------------------------------------------------------------
  const handleImport = async () => {
    if (!importPassword) {
      setError('Enter the password used during export');
      return;
    }
    if (!importFile) {
      setError('Select a file first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Derive export key to decrypt
      const exportKey = await deriveMasterKey(importPassword, importFile.exportSalt);

      const decryptedEntries = [];
      let failCount = 0;

      for (const enc of importFile.entries) {
        try {
          const plain = await decryptEntry(exportKey, enc);
          decryptedEntries.push(plain);
        } catch {
          failCount++;
        }
      }

      if (decryptedEntries.length === 0) {
        setError('Could not decrypt any entries. Wrong password?');
        return;
      }

      // Re-encrypt each entry with the current master key and import
      await onImport(decryptedEntries);

      setSuccess(
        `Imported ${decryptedEntries.length} entries` +
        (failCount > 0 ? ` (${failCount} failed to decrypt)` : '')
      );
      setImportFile(null);
      setImportPreview(null);
    } catch (err) {
      setError('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="vault-card w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileJson size={20} className="text-vault-accent" />
          Export / Import Vault
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {['export', 'import'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-vault-accent/10 text-vault-accent'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'export' ? (
                <span className="flex items-center justify-center gap-1.5"><Download size={14} /> Export</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><Upload size={14} /> Import</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
            <Check size={14} /> {success}
          </div>
        )}

        {/* Export tab */}
        {tab === 'export' && (
          <div className="space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex gap-2">
              <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Your export will be encrypted with the password below. You'll
                need this password to import the backup later.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Export Password</label>
              <input
                type="password"
                className="vault-input"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
              />
            </div>

            <p className="text-xs text-gray-500">
              {entries.length} entries will be exported
            </p>

            <button
              onClick={handleExport}
              disabled={loading || !exportPassword}
              className="vault-btn-primary w-full justify-center"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Download size={16} />
                  Export Encrypted Backup
                </>
              )}
            </button>
          </div>
        )}

        {/* Import tab */}
        {tab === 'import' && (
          <div className="space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Imported entries will be added to your vault. Existing entries
                won't be overwritten.
              </p>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="vault-btn-secondary w-full justify-center"
            >
              <Upload size={16} />
              Select backup file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {importPreview && (
              <p className="text-sm text-gray-400 text-center">{importPreview}</p>
            )}

            {importFile && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Export Password</label>
                  <input
                    type="password"
                    className="vault-input"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    placeholder="Password used during export"
                  />
                </div>

                <button
                  onClick={handleImport}
                  disabled={loading || !importPassword}
                  className="vault-btn-primary w-full justify-center"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Upload size={16} />
                      Import Entries
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
