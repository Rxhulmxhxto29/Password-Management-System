import zxcvbn from 'zxcvbn';

const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const COLORS = [
  'text-red-500',
  'text-orange-500',
  'text-yellow-500',
  'text-green-400',
  'text-emerald-400',
];
const BAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-400',
  'bg-emerald-400',
];

/**
 * Analyze password strength using zxcvbn.
 * Returns score, label, color classes, percentage, suggestions, crack time.
 */
export function analyzePassword(password) {
  if (!password) {
    return {
      score: 0,
      label: LABELS[0],
      color: COLORS[0],
      barColor: BAR_COLORS[0],
      percentage: 0,
      suggestions: [],
      crackTime: '',
    };
  }

  const result = zxcvbn(password);
  return {
    score: result.score,
    label: LABELS[result.score],
    color: COLORS[result.score],
    barColor: BAR_COLORS[result.score],
    percentage: (result.score / 4) * 100,
    suggestions: result.feedback.suggestions || [],
    crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
  };
}

/**
 * Check if a password is reused across vault entries.
 * Returns array of site names where the same password appears.
 */
export function checkPasswordReuse(password, allDecryptedPasswords) {
  if (!password || !allDecryptedPasswords?.length) return [];

  return allDecryptedPasswords
    .filter((entry) => entry.password === password)
    .map((entry) => entry.site);
}
