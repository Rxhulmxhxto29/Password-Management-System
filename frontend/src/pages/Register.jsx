import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import StrengthMeter from '../components/StrengthMeter.jsx';
import { analyzePassword } from '../utils/passwordStrength.js';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  // Password requirements
  const requirements = [
    { label: '12+ characters', met: password.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Symbol', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    const strength = analyzePassword(password);
    if (strength.score < 3) {
      setError('Please choose a stronger master password (at least "Strong")');
      return;
    }

    const result = await register(username, password);
    if (result.success) {
      navigate('/dashboard');
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
          <h1 className="text-2xl font-semibold text-white">Create Your Vault</h1>
          <p className="text-sm text-gray-500 mt-1">
            Zero-knowledge encryption — only you can access your data
          </p>
        </div>

        {/* Warning box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            <strong>Write down your master password.</strong> If you lose it,
            your vault CANNOT be recovered — we have no way to reset it.
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
                placeholder="Choose a username"
                required
                minLength={3}
                maxLength={32}
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
                  placeholder="Choose a strong master password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && <StrengthMeter password={password} />}
            </div>

            {/* Requirements checklist */}
            {password && (
              <div className="grid grid-cols-2 gap-1">
                {requirements.map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      req.met ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {req.met ? <Check size={12} /> : <X size={12} />}
                    {req.label}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Confirm Master Password
              </label>
              <input
                type="password"
                className="vault-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your master password"
                required
                autoComplete="new-password"
              />
              {confirm && password !== confirm && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="vault-btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Vault...
                </>
              ) : (
                'Create Vault'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-vault-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
