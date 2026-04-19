import { useState, useEffect, useRef } from 'react';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

export default function TOTPChallenge() {
  const { verifyTOTP, isLoading } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackup]);

  // Auto-submit when 6 digits are typed
  useEffect(() => {
    if (!useBackup && code.length === 6) {
      handleSubmit();
    }
  }, [code]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    const result = await verifyTOTP(code.trim());
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid code');
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="vault-card w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-vault-accent mx-auto" />
          <h1 className="text-xl font-semibold text-white">
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-gray-500">
            {useBackup
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {useBackup ? (
            <input
              ref={inputRef}
              type="text"
              className="vault-input text-center font-mono text-lg tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 10))}
              placeholder="backup code"
              maxLength={10}
              autoFocus
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="vault-input text-center text-2xl font-mono tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          )}

          {(useBackup || code.length === 6) && (
            <button
              type="submit"
              disabled={isLoading || (!useBackup && code.length !== 6) || (useBackup && code.length !== 10)}
              className="vault-btn-primary w-full justify-center"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Verify'
              )}
            </button>
          )}
        </form>

        <button
          onClick={() => {
            setUseBackup(!useBackup);
            setCode('');
            setError('');
          }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <KeyRound size={14} />
          {useBackup ? 'Use authenticator code instead' : 'Use backup code instead'}
        </button>
      </div>
    </div>
  );
}
