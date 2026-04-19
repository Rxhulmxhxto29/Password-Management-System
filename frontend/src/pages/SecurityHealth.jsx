import { useState, useMemo, useEffect } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Copy, Clock, RefreshCw,
  ArrowLeft, Loader2, ChevronRight, Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useVault } from '../hooks/useVault.jsx';
import { useTokenRefresh } from '../hooks/useTokenRefresh.jsx';
import { analyzePassword, checkPasswordReuse } from '../utils/passwordStrength.js';
import { checkAllPasswordsForBreaches } from '../utils/breachCheck.js';
import { useNavigate } from 'react-router-dom';

// Score → grade mapping
function getGrade(score) {
  if (score >= 95) return { label: 'A+', color: 'text-emerald-400' };
  if (score >= 85) return { label: 'A', color: 'text-emerald-400' };
  if (score >= 75) return { label: 'B', color: 'text-green-400' };
  if (score >= 60) return { label: 'C', color: 'text-yellow-400' };
  if (score >= 40) return { label: 'D', color: 'text-orange-400' };
  return { label: 'F', color: 'text-red-400' };
}

// SVG circular progress ring
function ScoreRing({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const grade = getGrade(score);

  let strokeColor = '#ef4444'; // red
  if (score > 70) strokeColor = '#22c55e'; // green
  else if (score > 40) strokeColor = '#f59e0b'; // amber

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        {/* Background ring */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke="#30363d" strokeWidth="10"
        />
        {/* Progress ring */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke={strokeColor} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className={`text-lg font-semibold ${grade.color}`}>{grade.label}</span>
      </div>
    </div>
  );
}

export default function SecurityHealth() {
  const { user, logout } = useAuth();
  const { entries, isLoading, fetchVault } = useVault();
  useTokenRefresh();
  const navigate = useNavigate();

  const [breachResults, setBreachResults] = useState([]);
  const [checkingBreaches, setCheckingBreaches] = useState(false);
  const [breachProgress, setBreachProgress] = useState({ checked: 0, total: 0 });
  const [breachChecked, setBreachChecked] = useState(false);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  // Decrypted passwords for analysis
  const allDecrypted = useMemo(
    () => entries.map((e) => ({ site: e.site, password: e.decrypted?.password })),
    [entries]
  );

  // Weak passwords
  const weakPasswords = useMemo(
    () => entries.filter((e) => {
      const pw = e.decrypted?.password;
      return pw && analyzePassword(pw).score < 2;
    }),
    [entries]
  );

  // Reused passwords (groups)
  const reusedGroups = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const pw = e.decrypted?.password;
      if (!pw) return;
      if (!map.has(pw)) map.set(pw, []);
      map.get(pw).push(e);
    });
    return [...map.values()].filter((group) => group.length > 1);
  }, [entries]);

  const reusedCount = reusedGroups.reduce((sum, g) => sum + g.length, 0);

  // Old passwords (not updated in 180+ days)
  const oldPasswords = useMemo(
    () => entries.filter((e) => {
      const days = (Date.now() - new Date(e.updatedAt)) / (1000 * 60 * 60 * 24);
      return days > 180;
    }).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)),
    [entries]
  );

  // Breached passwords
  const breachedPasswords = useMemo(
    () => breachResults.filter((r) => r.breached),
    [breachResults]
  );

  // Overall security score
  const score = useMemo(() => {
    if (entries.length === 0) return 100;
    let s = 100;
    s -= weakPasswords.length * 10;
    s -= reusedCount * 8;
    s -= breachedPasswords.length * 15;
    s -= oldPasswords.length * 3;
    return Math.max(0, Math.min(100, s));
  }, [entries, weakPasswords, reusedCount, breachedPasswords, oldPasswords]);

  // Personalized tips
  const tips = useMemo(() => {
    const t = [];
    if (weakPasswords.length > 0)
      t.push('Use the password generator for all new logins — aim for 16+ characters with mixed charsets.');
    if (reusedGroups.length > 0)
      t.push('Never reuse passwords. If one site is breached, all accounts sharing that password are at risk.');
    if (breachedPasswords.length > 0)
      t.push('Change breached passwords immediately. Attackers test leaked credentials across many sites.');
    if (oldPasswords.length > 0)
      t.push('Rotate old passwords periodically — especially for banking and email accounts.');
    if (t.length === 0)
      t.push('Great job! Keep using unique, strong passwords for every account.');
    return t.slice(0, 3);
  }, [weakPasswords, reusedGroups, breachedPasswords, oldPasswords]);

  const runBreachCheck = async () => {
    setCheckingBreaches(true);
    const total = entries.filter((e) => e.decrypted?.password).length;
    setBreachProgress({ checked: 0, total });
    const res = await checkAllPasswordsForBreaches(entries, (checked, t) => {
      setBreachProgress({ checked, total: t });
    });
    setBreachResults(res);
    setBreachChecked(true);
    setCheckingBreaches(false);
  };

  const daysSince = (date) => Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-bg flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-vault-bg/80 backdrop-blur border-b border-vault-border px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="vault-btn-secondary"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield size={20} className="text-vault-accent" />
          Security Health
        </h1>
        <div className="flex-1" />
        <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors" title="Lock Vault">
          <Lock size={16} />
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Score section */}
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={score} />
          <p className="text-sm text-gray-500">
            Based on {entries.length} vault {entries.length === 1 ? 'item' : 'items'}
            {!breachChecked && ' — run breach check for full analysis'}
          </p>
          {!breachChecked && (
            <button
              onClick={runBreachCheck}
              disabled={checkingBreaches || entries.length === 0}
              className="vault-btn-primary"
            >
              {checkingBreaches ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Checking {breachProgress.checked}/{breachProgress.total}...
                </>
              ) : (
                <>
                  <ShieldAlert size={14} />
                  Run breach check
                </>
              )}
            </button>
          )}
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Weak passwords */}
          <div className="vault-card space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-white">Weak Passwords</h3>
              <span className={`ml-auto text-lg font-bold ${weakPasswords.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {weakPasswords.length}
              </span>
            </div>
            {weakPasswords.length > 0 ? (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {weakPasswords.map((e) => (
                  <li key={e._id} className="flex items-center gap-2 text-sm text-gray-400">
                    <ChevronRight size={12} className="text-red-400 shrink-0" />
                    <span className="truncate">{e.site}</span>
                    <span className="text-xs text-gray-600">({analyzePassword(e.decrypted?.password).label})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No weak passwords found!</p>
            )}
          </div>

          {/* Card 2: Reused passwords */}
          <div className="vault-card space-y-3">
            <div className="flex items-center gap-2">
              <Copy size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium text-white">Reused Passwords</h3>
              <span className={`ml-auto text-lg font-bold ${reusedGroups.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {reusedGroups.length} {reusedGroups.length === 1 ? 'group' : 'groups'}
              </span>
            </div>
            {reusedGroups.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {reusedGroups.map((group, i) => (
                  <li key={i} className="text-sm text-gray-400">
                    <span className="text-amber-400 text-xs">Shared:</span>{' '}
                    {group.map((e) => e.site).join(', ')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No reused passwords!</p>
            )}
          </div>

          {/* Card 3: Breached passwords */}
          <div className="vault-card space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-white">Breached Passwords</h3>
              <span className={`ml-auto text-lg font-bold ${breachedPasswords.length > 0 ? 'text-red-400' : breachChecked ? 'text-green-400' : 'text-gray-500'}`}>
                {breachChecked ? breachedPasswords.length : '—'}
              </span>
            </div>
            {!breachChecked ? (
              <p className="text-xs text-gray-500">Run breach check above to scan all passwords.</p>
            ) : breachedPasswords.length > 0 ? (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {breachedPasswords.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-gray-400">
                    <ChevronRight size={12} className="text-red-400 shrink-0" />
                    <span className="truncate">{r.site}</span>
                    <span className="text-xs text-red-400">({r.count.toLocaleString()} breaches)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck size={12} className="text-green-400" />
                No breached passwords found!
              </p>
            )}
          </div>

          {/* Card 4: Old passwords */}
          <div className="vault-card space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              <h3 className="text-sm font-medium text-white">Old Passwords</h3>
              <span className={`ml-auto text-lg font-bold ${oldPasswords.length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {oldPasswords.length}
              </span>
            </div>
            {oldPasswords.length > 0 ? (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {oldPasswords.map((e) => (
                  <li key={e._id} className="flex items-center gap-2 text-sm text-gray-400">
                    <ChevronRight size={12} className="text-orange-400 shrink-0" />
                    <span className="truncate">{e.site}</span>
                    <span className="text-xs text-gray-600">{daysSince(e.updatedAt)} days old</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">All passwords are recent!</p>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="vault-card space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-vault-accent" />
            Personalized Tips
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-400 flex gap-2">
                <span className="text-vault-accent shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
