import { useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Loader2, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { checkAllPasswordsForBreaches } from '../utils/breachCheck.js';

export default function BreachReport({ entries, onEditEntry }) {
  const [results, setResults] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });

  const runCheck = async () => {
    setChecking(true);
    setResults(null);
    const total = entries.filter((e) => e.decrypted?.password).length;
    setProgress({ checked: 0, total });

    const res = await checkAllPasswordsForBreaches(entries, (checked, t) => {
      setProgress({ checked, total: t });
    });

    setResults(res);
    setChecking(false);
  };

  const breached = results?.filter((r) => r.breached) || [];
  const safe = results?.filter((r) => !r.breached && !r.error) || [];
  const errors = results?.filter((r) => r.error) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Shield size={16} className="text-vault-accent" />
          Breach Detection
        </h3>
        <button
          onClick={runCheck}
          disabled={checking || entries.length === 0}
          className="vault-btn-primary text-xs"
        >
          {checking ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Checking {progress.checked}/{progress.total}...
            </>
          ) : results ? (
            <>
              <Shield size={14} />
              Re-check
            </>
          ) : (
            <>
              <ShieldAlert size={14} />
              Check for breaches
            </>
          )}
        </button>
      </div>

      {/* Progress bar while checking */}
      {checking && progress.total > 0 && (
        <div className="w-full bg-vault-border rounded-full h-1.5">
          <div
            className="bg-vault-accent h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${(progress.checked / progress.total) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Results */}
      {results && !checking && (
        <div className="space-y-3">
          {/* Summary */}
          {breached.length === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-300">
                All {safe.length} passwords are safe — no breaches found!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-red-300">
                <strong>{breached.length}</strong> password
                {breached.length !== 1 ? 's' : ''} found in data breaches
              </span>
            </div>
          )}

          {/* Breached entries list */}
          {breached.length > 0 && (
            <div className="space-y-1.5">
              {breached.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2"
                >
                  <ShieldAlert size={14} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{r.site}</p>
                    <p className="text-xs text-red-400">
                      Found in {r.count.toLocaleString()} breach
                      {r.count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => onEditEntry?.(r.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-2 py-1 rounded transition-colors shrink-0"
                  >
                    Change
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error count */}
          {errors.length > 0 && (
            <p className="text-xs text-gray-500">
              {errors.length} password{errors.length !== 1 ? 's' : ''} could
              not be checked (network error)
            </p>
          )}

          {/* Privacy disclaimer */}
          <p className="text-[10px] text-gray-600 flex items-center gap-1">
            <Shield size={10} />
            Passwords are never sent to any server. Only an anonymized partial
            hash is used (k-anonymity).
          </p>
        </div>
      )}

      {/* Empty state */}
      {!results && !checking && entries.length === 0 && (
        <p className="text-sm text-gray-500">
          Add some passwords to check for breaches.
        </p>
      )}
    </div>
  );
}
