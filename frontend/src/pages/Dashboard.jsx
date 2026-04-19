import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Key, CreditCard, FileText, UserSquare,
  Shield, Heart, AlertTriangle, Lock, RefreshCw,
  SlidersHorizontal, ArrowDownAZ, Clock, ShieldAlert, ShieldCheck, FileJson,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useVault } from '../hooks/useVault.jsx';
import { useTokenRefresh } from '../hooks/useTokenRefresh.jsx';
import PasswordCard from '../components/PasswordCard.jsx';
import PasswordForm from '../components/PasswordForm.jsx';
import PasswordGenerator from '../components/PasswordGenerator.jsx';
import BreachBanner from '../components/BreachBanner.jsx';
import BreachReport from '../components/BreachReport.jsx';
import TOTPSetup from '../components/TOTPSetup.jsx';
import ExportImport from '../components/ExportImport.jsx';
import { useAutoLock } from '../hooks/useAutoLock.jsx';
import { analyzePassword, checkPasswordReuse } from '../utils/passwordStrength.js';

const NAV_CATEGORIES = [
  { key: 'all', label: 'All Items', icon: Key },
  { key: 'login', label: 'Logins', icon: Key },
  { key: 'card', label: 'Cards', icon: CreditCard },
  { key: 'note', label: 'Notes', icon: FileText },
  { key: 'identity', label: 'Identity', icon: UserSquare },
];

const SORT_OPTIONS = [
  { key: 'az', label: 'A-Z', icon: ArrowDownAZ },
  { key: 'weak', label: 'Weak first', icon: ShieldAlert },
  { key: 'recent', label: 'Recent', icon: Clock },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { entries, isLoading, error, fetchVault, addEntry, updateEntry, deleteEntry } = useVault();
  useTokenRefresh();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showBreachReport, setShowBreachReport] = useState(false);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(null);
  const { timeoutMinutes, setTimeoutMinutes, remaining } = useAutoLock();

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // -- Compute stats --------------------------------------------------------
  const allDecrypted = useMemo(
    () => entries.map((e) => ({ site: e.site, password: e.decrypted?.password })),
    [entries]
  );

  const stats = useMemo(() => {
    let weakCount = 0;
    let reusedSet = new Set();

    entries.forEach((e) => {
      const pw = e.decrypted?.password;
      if (!pw) return;
      const s = analyzePassword(pw);
      if (s.score < 3) weakCount++;
      const reuses = checkPasswordReuse(pw, allDecrypted);
      if (reuses.length > 1) reuses.forEach((r) => reusedSet.add(r));
    });

    const reusedCount = reusedSet.size;
    const score = Math.max(0, 100 - weakCount * 15 - reusedCount * 10);

    return {
      total: entries.length,
      weakCount,
      reusedCount,
      score,
    };
  }, [entries, allDecrypted]);

  // -- Filter & sort --------------------------------------------------------
  const filtered = useMemo(() => {
    let list = [...entries];

    // Category filter
    if (activeCategory !== 'all') {
      list = list.filter((e) => e.category === activeCategory);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.site.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'az') {
      list.sort((a, b) => a.site.localeCompare(b.site));
    } else if (sortBy === 'weak') {
      list.sort((a, b) => {
        const sa = analyzePassword(a.decrypted?.password || '').score;
        const sb = analyzePassword(b.decrypted?.password || '').score;
        return sa - sb;
      });
    } else {
      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return list;
  }, [entries, activeCategory, search, sortBy]);

  // -- Handlers -------------------------------------------------------------
  const handleSave = async (data) => {
    if (editEntry) {
      await updateEntry(editEntry._id, data);
    } else {
      await addEntry(data);
    }
    setShowForm(false);
    setEditEntry(null);
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this entry? This cannot be undone.')) {
      await deleteEntry(id);
    }
  };

  // -- Category counts ------------------------------------------------------
  const categoryCounts = useMemo(() => {
    const counts = { all: entries.length, login: 0, card: 0, note: 0, identity: 0 };
    entries.forEach((e) => {
      if (counts[e.category] !== undefined) counts[e.category]++;
    });
    return counts;
  }, [entries]);

  return (
    <div className="min-h-screen bg-vault-bg flex">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-60 bg-vault-surface border-r border-vault-border flex flex-col shrink-0 h-screen sticky top-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-vault-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-vault-accent" />
            <span className="font-semibold text-white">Secure Vault</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Welcome, {user?.username}</p>
        </div>

        {/* Nav categories */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            Vault
          </p>
          {NAV_CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeCategory === key
                  ? 'bg-vault-accent/10 text-vault-accent'
                  : 'text-gray-400 hover:bg-vault-card hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{label}</span>
              <span className="text-xs text-gray-600">{categoryCounts[key]}</span>
            </button>
          ))}

          <p className="px-3 pt-4 text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            Tools
          </p>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-vault-card hover:text-gray-200 transition-colors"
          >
            <SlidersHorizontal size={16} />
            <span>Password Generator</span>
          </button>
          <button
            onClick={() => setShowBreachReport(!showBreachReport)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-vault-card hover:text-gray-200 transition-colors"
          >
            <ShieldAlert size={16} />
            <span>Breach Detection</span>
          </button>
          <button
            onClick={() => setShowExportImport(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-vault-card hover:text-gray-200 transition-colors"
          >
            <FileJson size={16} />
            <span>Export / Import</span>
          </button>

          <p className="px-3 pt-4 text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            Security
          </p>
          <button
            onClick={() => navigate('/security')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-vault-card hover:text-gray-200 transition-colors"
          >
            <Shield size={16} />
            <span>Security Health</span>
          </button>
          <button
            onClick={() => setShowTOTPSetup(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-vault-card hover:text-gray-200 transition-colors"
          >
            <ShieldCheck size={16} />
            <span>Two-Factor Auth</span>
          </button>

          <p className="px-3 pt-4 text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            Settings
          </p>
          <div className="px-3 space-y-2">
            <label className="text-xs text-gray-500 block">Auto-Lock Timer</label>
            <select
              value={timeoutMinutes}
              onChange={(e) => setTimeoutMinutes(parseInt(e.target.value, 10))}
              className="vault-input text-sm py-1.5"
            >
              <option value={0}>Disabled</option>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
            {remaining != null && timeoutMinutes > 0 && (
              <p className="text-[10px] text-gray-600">
                Locks in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </p>
            )}
          </div>
        </nav>

        {/* Bottom user section */}
        <div className="px-4 py-3 border-t border-vault-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-vault-accent/20 flex items-center justify-center text-xs font-medium text-vault-accent">
              {user?.username?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm text-gray-300 flex-1 truncate">
              {user?.username}
            </span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Lock Vault"
            >
              <Lock size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-vault-bg/80 backdrop-blur border-b border-vault-border px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              className="vault-input pl-9"
              placeholder="Search vault..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="vault-btn-secondary"
          >
            <RefreshCw size={16} />
            Generate
          </button>
          <button
            onClick={() => { setEditEntry(null); setShowForm(true); }}
            className="vault-btn-primary"
          >
            <Plus size={16} />
            Add Item
          </button>
        </header>

        <div className="px-6 py-5 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Items', value: stats.total, color: 'text-blue-400' },
              { label: 'Weak Passwords', value: stats.weakCount, color: 'text-red-400' },
              { label: 'Reused Passwords', value: stats.reusedCount, color: 'text-amber-400' },
              { label: 'Security Score', value: stats.score, color: stats.score >= 80 ? 'text-green-400' : stats.score >= 50 ? 'text-amber-400' : 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="vault-card">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Breach banner */}
          {stats.weakCount > 0 && (
            <BreachBanner
              count={stats.weakCount}
              onReview={() => setSortBy('weak')}
            />
          )}

          {/* Password generator panel */}
          {showGenerator && (
            <div className="vault-card">
              <PasswordGenerator />
            </div>
          )}

          {/* Breach report panel */}
          {showBreachReport && (
            <div className="vault-card">
              <BreachReport
                entries={entries}
                onEditEntry={(id) => {
                  const entry = entries.find((e) => e._id === id);
                  if (entry) handleEdit(entry);
                }}
              />
            </div>
          )}

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  sortBy === key
                    ? 'bg-vault-accent/10 text-vault-accent'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Vault list */}
          {isLoading ? (
            <div className="text-center py-20 text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Decrypting vault...
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              {entries.length === 0
                ? 'Your vault is empty. Click "Add Item" to get started.'
                : 'No entries match your search.'}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((entry) => (
                <PasswordCard
                  key={entry._id}
                  entry={entry}
                  allDecrypted={allDecrypted}
                  onEdit={() => handleEdit(entry)}
                  onDelete={() => handleDelete(entry._id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Modal overlays ─────────────────────────────────────────── */}
      {showForm && (
        <PasswordForm
          entry={editEntry}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
        />
      )}

      {showTOTPSetup && (
        <TOTPSetup
          onClose={() => setShowTOTPSetup(false)}
          onEnabled={() => setShowTOTPSetup(false)}
        />
      )}

      {showExportImport && (
        <ExportImport
          entries={entries}
          onImport={async (decryptedEntries) => {
            for (const entry of decryptedEntries) {
              await addEntry({
                site: entry.site || 'Imported',
                username: entry.username || '',
                password: entry.password || '',
                category: entry.category || 'login',
              });
            }
          }}
          onClose={() => setShowExportImport(false)}
        />
      )}
    </div>
  );
}
