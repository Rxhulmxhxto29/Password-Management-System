import { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Copy, Pencil, Trash2, Check,
} from 'lucide-react';
import { analyzePassword, checkPasswordReuse } from '../utils/passwordStrength.js';

export default function PasswordCard({ entry, allDecrypted, onEdit, onDelete }) {
  const [revealed, setRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const timerRef = useRef(null);

  const pw = entry.decrypted?.password || '';
  const strength = analyzePassword(pw);
  const reuses = checkPasswordReuse(pw, allDecrypted || []);

  // Auto-hide revealed password after 5 seconds
  useEffect(() => {
    if (revealed) {
      timerRef.current = setTimeout(() => setRevealed(false), 5000);
      return () => clearTimeout(timerRef.current);
    }
  }, [revealed]);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);

      // Security: clear clipboard after 30 seconds
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 30000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  // Left border color based on strength
  const borderColor =
    strength.score < 2
      ? 'border-l-red-500'
      : strength.score < 3
      ? 'border-l-amber-500'
      : 'border-l-transparent';

  // Category badge
  const categoryBadge = {
    login: 'bg-blue-500/10 text-blue-400',
    card: 'bg-purple-500/10 text-purple-400',
    note: 'bg-green-500/10 text-green-400',
    identity: 'bg-amber-500/10 text-amber-400',
  };

  // Initials circle color
  const siteInitials = (entry.site || 'UN').slice(0, 2).toUpperCase();
  const initialsColor = `hsl(${siteInitials.charCodeAt(0) * 7}, 60%, 45%)`;

  return (
    <div
      className={`vault-card border-l-4 ${borderColor} flex items-center gap-4 animate-in fade-in duration-300`}
    >
      {/* Site avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium text-white shrink-0"
        style={{ backgroundColor: initialsColor }}
      >
        {siteInitials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-200 truncate">{entry.site}</p>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              categoryBadge[entry.category] || categoryBadge.login
            }`}
          >
            {entry.category}
          </span>
          {reuses.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
              reused
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{entry.username}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-sm text-gray-400">
            {revealed ? pw : '••••••••••'}
          </span>
          <button
            onClick={() => setRevealed(!revealed)}
            className="text-gray-500 hover:text-gray-300"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Strength badge */}
      <div className="shrink-0">
        <span
          className={`text-[10px] px-2 py-1 rounded-full ${
            strength.score < 2
              ? 'bg-red-500/10 text-red-400'
              : strength.score < 3
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-green-500/10 text-green-400'
          }`}
        >
          {strength.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => copyToClipboard(pw, 'pw')}
          className="p-1.5 rounded hover:bg-vault-border text-gray-500 hover:text-gray-300 transition-colors"
          title="Copy password"
        >
          {copiedField === 'pw' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => copyToClipboard(entry.username, 'user')}
          className="p-1.5 rounded hover:bg-vault-border text-gray-500 hover:text-gray-300 transition-colors"
          title="Copy username"
        >
          {copiedField === 'user' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-vault-border text-gray-500 hover:text-gray-300 transition-colors"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-vault-border text-gray-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
