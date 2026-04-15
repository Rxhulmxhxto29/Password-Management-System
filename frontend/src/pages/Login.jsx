import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { Lock, Loader } from 'lucide-react';
import { deriveMasterKey, deriveAuthKey } from '../utils/crypto';
import AnimatedBackground from '../components/AnimatedBackground';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Access Vault');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatusText('Locating vault...');
    
    try {
      // 1. Get the salt associated with the username
      const salt = await authService.getSalt(username);
      
      setStatusText('Deriving secure keys...');
      // 2. Derive the Master Key using PBKDF2 (takes a little time)
      const masterKey = await deriveMasterKey(password, salt);
      
      // 3. Derive Auth Key from Master Key
      const authKey = await deriveAuthKey(masterKey);

      setStatusText('Authenticating...');
      // 4. Authenticate using the AuthKey
      const data = await authService.login(username, authKey);
      
      // 5. Success! Pass down the raw masterKey (in-memory only)
      onLogin({ id: data._id, username: data.username }, data.token, masterKey);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
      setStatusText('Access Vault');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <div className="w-full max-w-md bg-dark-800/80 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Log in to your zero-knowledge vault</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Master Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter your master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
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
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
