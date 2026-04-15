import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { Shield, Loader } from 'lucide-react';
import { generateSalt, deriveMasterKey, deriveAuthKey } from '../utils/crypto';
import AnimatedBackground from '../components/AnimatedBackground';

const Register = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Create Vault');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (password.length < 6) {
      return setError('Master Password must be at least 6 characters long');
    }

    setLoading(true);
    setStatusText('Generating encryption parameters...');
    
    try {
      // 1. Generate unique random salt for the user
      const salt = generateSalt();
      
      // 2. Derive Master Key (high iterations PBKDF2)
      setStatusText('Strengthening keys (this takes a moment)...');
      const masterKey = await deriveMasterKey(password, salt);
      
      // 3. Derive Auth Key
      const authKey = await deriveAuthKey(masterKey);

      // 4. Register using AuthKey and Salt (No plain text password sent)
      setStatusText('Securing vault...');
      const data = await authService.register(username, authKey, salt);
      
      // 5. Login immediately
      onLogin({ id: data._id, username: data.username }, data.token, masterKey);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
      setStatusText('Create Vault');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <div className="w-full max-w-md bg-dark-800/80 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400 text-center">Setup your zero-knowledge vault.<br/><span className="text-primary-400 text-xs">Your password will NEVER leave your device.</span></p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Master Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Repeat master password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary mt-6"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-5 h-5 animate-spin" /> {statusText}
              </span>
            ) : statusText}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Log in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
