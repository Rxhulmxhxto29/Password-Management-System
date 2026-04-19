import { useMemo } from 'react';
import { analyzePassword } from '../utils/passwordStrength.js';

const SEGMENT_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

export default function StrengthMeter({ password }) {
  const analysis = useMemo(() => analyzePassword(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* 4-segment bar */}
      <div className="flex gap-1">
        {SEGMENT_COLORS.map((color, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= analysis.score - 1 ? color : 'bg-vault-border'
            }`}
          />
        ))}
      </div>

      {/* Label + crack time */}
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${analysis.color}`}>
          {analysis.label}
        </span>
        <span className="text-xs text-gray-500">
          {analysis.crackTime ? `Crack time: ${analysis.crackTime}` : ''}
        </span>
      </div>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <ul className="text-xs text-gray-500 space-y-0.5">
          {analysis.suggestions.slice(0, 2).map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
