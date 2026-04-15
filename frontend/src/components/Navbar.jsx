import React from 'react';
import { Lock, LogOut, User } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="bg-dark-800 border-b border-dark-700 py-4 px-6 fixed w-full top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-500">
          <Lock className="w-6 h-6" />
          <h1 className="text-xl font-bold text-white tracking-wide">SecureVault</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-5 h-5 text-gray-400" />
            <span className="font-medium">{user?.username}</span>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
