import { useState, useEffect, useRef } from 'react';
import {
  X, Eye, EyeOff, RefreshCw, Star, Loader2, ShieldAlert,
} from 'lucide-react';
import StrengthMeter from './StrengthMeter.jsx';
import { generatePassword } from '../utils/crypto.js';
import { checkPasswordBreach } from '../utils/breachCheck.js';

const CATEGORIES = [
  { value: 'login', label: 'Login' },
  { value: 'card', label: 'Card' },
  { value: 'note', label: 'Secure Note' },
  { value: 'identity', label: 'Identity' },
];

export default function PasswordForm({ entry, onSave, onClose }) {
  const isEdit = !!entry;

  const [site, setSite] = useState(entry?.site || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.decrypted?.password || '');
  const [category, setCategory] = useState(entry?.category || 'login');
  const [isFavourite, setIsFavourite] = useState(entry?.isFavourite || false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [breachResult, setBreachResult] = useState(null);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const breachTimer = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Live breach check — debounced 800ms after typing stops
  useEffect(() => {
    if (!password || password.length < 4) {
      setBreachResult(null);
      return;
    }
    clearTimeout(breachTimer.current);
    breachTimer.current = setTimeout(async () => {
      setCheckingBreach(true);
      try {
        const result = await checkPasswordBreach(password);
        setBreachResult(result);
      } catch {
        setBreachResult(null);
      } finally {
        setCheckingBreach(false);
      }
    }, 800);
    return () => clearTimeout(breachTimer.current);
  }, [password]);

  const handleGenerate = () => {
    setPassword(generatePassword({ length: 20 }));
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!site.trim() || !username.trim() || !password) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    try {
      await onSave({ site: site.trim(), username: username.trim(), password, category, isFavourite });
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="vault-card w-full max-w-md relative animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-white mb-4">
          {isEdit ? 'Edit item' : 'Add new item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Site */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Site / Service</label>
            <input
              type="text"
              className="vault-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. GitHub, Netflix"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username / Email</label>
            <input
              type="text"
              className="vault-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. user@email.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="vault-input pr-10 font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter or generate a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="vault-btn-secondary shrink-0"
                title="Generate password"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {password && <StrengthMeter password={password} />}
            {/* Live breach warning */}
            {checkingBreach && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <Loader2 size={12} className="animate-spin" />
                Checking breaches...
              </div>
            )}
            {!checkingBreach && breachResult?.breached && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                <ShieldAlert size={12} />
                This password appeared in {breachResult.count.toLocaleString()} data breach{breachResult.count !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* Category & Favourite */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                className="vault-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsFavourite(!isFavourite)}
              className={`p-2 rounded-lg border transition-colors ${
                isFavourite
                  ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                  : 'border-vault-border text-gray-500 hover:text-amber-400'
              }`}
              title="Toggle favourite"
            >
              <Star size={18} fill={isFavourite ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="vault-btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="vault-btn-primary flex-1 justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
