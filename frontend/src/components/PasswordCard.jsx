import { useState } from 'react';
import { Copy, Eye, EyeOff, Edit2, Trash2, CheckCircle2, Globe } from 'lucide-react';

const PasswordCard = ({ password, onEdit, onDelete }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-dark-600 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <div className="truncate">
            <h3 className="font-semibold text-white truncate text-lg" title={password.site}>
              {password.site}
            </h3>
            <p className="text-xs text-gray-500 truncate" title={password.username}>
              {password.username}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit} 
            className="p-1.5 text-gray-400 hover:text-primary-400 rounded-md hover:bg-dark-700 transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-dark-700 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between bg-dark-900 rounded-lg p-2.5 border border-transparent hover:border-dark-700 transition-colors">
          <div className="text-sm text-gray-400 truncate pr-2 w-full">
            {password.username}
          </div>
          <button 
            onClick={() => handleCopy(password.username, 'username')}
            className={`p-1 rounded transition ${copiedField === 'username' ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
            title="Copy Username"
          >
            {copiedField === 'username' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between bg-dark-900 rounded-lg p-2.5 border border-transparent hover:border-dark-700 transition-colors">
          <div className="text-sm text-gray-400 truncate pr-2 w-full font-mono">
            {showPassword ? password.password : '••••••••••••'}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 rounded text-gray-500 hover:text-white transition"
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => handleCopy(password.password, 'password')}
              className={`p-1 rounded transition ${copiedField === 'password' ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
              title="Copy Password"
            >
              {copiedField === 'password' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordCard;
