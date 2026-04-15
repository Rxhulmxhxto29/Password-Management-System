import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // The MasterKey is ONLY stored in memory for maximum security.
  // Refreshing the browser will wipe it and require re-login.
  const [masterKey, setMasterKey] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    // We do NOT auto-login if they refresh the page, because the masterKey is gone.
    // However, if we wanted to support a "soft session", we could check for token.
    // For Zero-Knowledge, no masterKey means we can't show passwords. 
    // They must re-enter their master password to derive the key again.
  }, []);

  const handleLogin = (userData, token, derivedMasterKey) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setMasterKey(derivedMasterKey); // store purely in state
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMasterKey(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/register" 
              element={!isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/" 
              element={(isAuthenticated && masterKey) ? <Dashboard masterKey={masterKey} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
