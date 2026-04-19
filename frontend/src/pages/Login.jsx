import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(username, password);
    if (result.success) {
      if (result.requiresTOTP) {
        navigate('/totp-challenge');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-vault-accent/10 mb-4">
            <Shield className="w-8 h-8 text-vault-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Secure Vault</h1>
          <p className="text-sm text-gray-500 mt-1">
            Zero-knowledge &bull; AES-256-GCM &bull; End-to-end encrypted
          </p>
        </div>

        {/* Form card */}
        <div className="vault-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                className="vault-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="vault-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="vault-btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Unlocking...
                </>
              ) : (
                'Unlock Vault'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-vault-accent hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Security notice */}
        <p className="text-center text-xs text-gray-600 mt-4">
          🔒 Your master password never leaves this device
        </p>
      </div>
    </div>
  );
}
