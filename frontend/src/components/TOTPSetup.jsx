import { useState } from 'react';
import {
  Shield, ShieldCheck, Loader2, X, Copy, Check, AlertTriangle,
} from 'lucide-react';
import { api } from '../utils/api.js';

export default function TOTPSetup({ onClose, onEnabled }) {
  const [step, setStep] = useState(1); // 1=intro, 2=QR, 3=verify, 4=backup codes
  const [qrData, setQrData] = useState(null);
  const [manualKey, setManualKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Step 1 → 2: Generate secret and QR code
  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/totp/setup');
      setQrData(data.qrCodeDataUrl);
      setManualKey(data.manualEntryKey);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify TOTP code
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/totp/verify-setup', {
        token: verifyCode,
      });
      setBackupCodes(data.backupCodes);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code, try again');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDone = () => {
    onEnabled?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="vault-card w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield size={20} className="text-vault-accent" />
              Enable Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-400">
              Add an extra layer of security to your vault. You'll need an
              authenticator app like Google Authenticator or Authy.
            </p>
            <button
              onClick={handleSetup}
              disabled={loading}
              className="vault-btn-primary w-full justify-center"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Set up 2FA'
              )}
            </button>
          </div>
        )}

        {/* Step 2: Show QR code */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Scan QR Code
            </h2>
            <p className="text-sm text-gray-400">
              Scan this QR code with your authenticator app.
            </p>

            {qrData && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrData} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-gray-500">
                Can't scan? Enter this key manually:
              </p>
              <div className="vault-input font-mono text-xs break-all select-all">
                {manualKey}
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="vault-btn-primary w-full justify-center"
            >
              Next — Enter verification code
            </button>
          </div>
        )}

        {/* Step 3: Verify code */}
        {step === 3 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Verify Setup
            </h2>
            <p className="text-sm text-gray-400">
              Enter the 6-digit code from your authenticator app.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <input
              type="text"
              className="vault-input text-center text-2xl font-mono tracking-[0.5em]"
              value={verifyCode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerifyCode(v);
              }}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="vault-btn-primary w-full justify-center"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Verify and enable 2FA'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="vault-btn-secondary w-full justify-center"
            >
              Back to QR code
            </button>
          </form>
        )}

        {/* Step 4: Backup codes */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              2FA Enabled!
            </h2>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex gap-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Save these backup codes somewhere safe. Each can only be used
                once. They will <strong>NOT</strong> be shown again.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="bg-vault-bg border border-vault-border rounded px-3 py-1.5 font-mono text-sm text-gray-300 text-center"
                >
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={copyBackupCodes}
              className="vault-btn-secondary w-full justify-center"
            >
              {copiedCodes ? (
                <>
                  <Check size={14} className="text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy all codes
                </>
              )}
            </button>

            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="accent-vault-accent"
              />
              I have saved my backup codes
            </label>

            <button
              onClick={handleDone}
              disabled={!confirmed}
              className="vault-btn-primary w-full justify-center"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
