import { useState, useEffect } from 'react';
import { X, RefreshCcw, Loader } from 'lucide-react';

const PasswordForm = ({ initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    site: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        site: initialData.site || '',
        username: initialData.username || '',
        password: initialData.password || ''
      });
    }
  }, [initialData]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-dark-700">
          <h3 className="text-xl font-bold text-white">
            {initialData ? 'Edit Password' : 'Add New Password'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Website or App Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Netflix, Google, GitHub"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username or Email</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your username or email"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-400">Password</label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCcw className="w-3 h-3" /> Generate Strong
              </button>
            </div>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="Your secure password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-700 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 btn-primary !py-3"
              disabled={loading}
            >
              {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Save entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordForm;
