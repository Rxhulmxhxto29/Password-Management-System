import { Shield, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-vault-surface border-b border-vault-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-vault-accent" />
        <span className="font-semibold text-white text-sm">Secure Vault</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user?.username}</span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors"
          title="Lock Vault"
        >
          <Lock size={14} />
          Lock
        </button>
      </div>
    </nav>
  );
}
