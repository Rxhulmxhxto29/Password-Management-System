import { useState, useEffect } from 'react';
import { passwordService } from '../services/api';
import PasswordCard from '../components/PasswordCard';
import PasswordForm from '../components/PasswordForm';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import { encryptPassword, decryptPassword } from '../utils/crypto';

const Dashboard = ({ masterKey }) => {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);

  useEffect(() => {
    fetchPasswords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPasswords = async () => {
    try {
      const data = await passwordService.getAll();
      
      const decryptedDataList = [];
      for (const entry of data) {
        if (!entry.encryptedData || !entry.iv || !entry.authTag) {
          continue; // gracefully handle legacy unencrypted or corrupted rows
        }

        const plaintextPass = await decryptPassword(
          entry.encryptedData,
          entry.iv,
          entry.authTag,
          masterKey
        );

        decryptedDataList.push({
          _id: entry._id,
          site: entry.site,
          username: entry.username,
          password: plaintextPass,
          createdAt: entry.createdAt
        });
      }

      setPasswords(decryptedDataList);
    } catch (error) {
      console.error('Failed to fetch/decrypt passwords', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      // Data from the form is strictly plain text `{ site, username, password }`
      // We perform client-side AES-GCM encryption before it ever touches the network
      const { encryptedData, iv, authTag } = await encryptPassword(data.password, masterKey);

      const payload = {
        site: data.site,
        username: data.username,
        encryptedData,
        iv,
        authTag
      };

      if (currentEdit) {
        await passwordService.update(currentEdit._id, payload);
      } else {
        await passwordService.create(payload);
      }
      fetchPasswords();
      setIsModalOpen(false);
      setCurrentEdit(null);
    } catch (error) {
      console.error('Failed to save password', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this password?')) {
      try {
        await passwordService.delete(id);
        fetchPasswords();
      } catch (error) {
        console.error('Failed to delete password', error);
      }
    }
  };

  const handleEdit = (password) => {
    setCurrentEdit(password);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setCurrentEdit(null);
    setIsModalOpen(true);
  };

  const filteredPasswords = passwords.filter(p => 
    p.site.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-primary-500" />
            Your Vault (Zero-Knowledge)
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage your secure credentials</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search vault..." 
              className="input-field pl-10 h-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={openNewModal} className="btn-primary whitespace-nowrap !w-auto">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add New</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredPasswords.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center shadow-xl">
          <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4 relative opacity-50" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">Your vault is empty</h3>
          <p className="text-gray-500 mb-6">Add your first password to store it securely, encrypted exclusively with your device.</p>
          <button onClick={openNewModal} className="btn-primary mx-auto !w-auto">
            <Plus className="w-5 h-5" /> Add Password
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPasswords.map(password => (
            <PasswordCard 
              key={password._id} 
              password={password} 
              onEdit={() => handleEdit(password)}
              onDelete={() => handleDelete(password._id)}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <PasswordForm 
          initialData={currentEdit} 
          onSave={handleSave} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
