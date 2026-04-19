import { AlertTriangle } from 'lucide-react';

export default function BreachBanner({ count, onReview }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
      <p className="text-sm text-red-300 flex-1">
        <strong>{count} password{count !== 1 ? 's' : ''}</strong> need attention — they may be weak or compromised.
      </p>
      <button
        onClick={onReview}
        className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded-lg border border-red-500/30 hover:bg-red-500/10"
      >
        Review
      </button>
    </div>
  );
}
