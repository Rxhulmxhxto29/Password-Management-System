const Password = require('../models/Password');

const getPasswords = async (req, res) => {
  try {
    const passwords = await Password.find({ userId: req.user.id });
    
    // Server doesn't decrypt anymore. Just send the encrypted chunks.
    const securePasswords = passwords.map((entry) => ({
      _id: entry._id,
      site: entry.site,
      username: entry.username,
      encryptedData: entry.encryptedData,
      iv: entry.iv,
      authTag: entry.authTag,
      createdAt: entry.createdAt,
    }));
    
    res.json(securePasswords);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching passwords' });
  }
};

const addPassword = async (req, res) => {
  try {
    const { site, username, encryptedData, iv, authTag } = req.body;
    
    if (!site || !username || !encryptedData || !iv || !authTag) {
      return res.status(400).json({ message: 'Please provide all fields correctly' });
    }
    
    const newPassword = await Password.create({
      userId: req.user.id,
      site,
      username,
      encryptedData,
      iv,
      authTag
    });
    
    res.status(201).json({
      _id: newPassword._id,
      site: newPassword.site,
      username: newPassword.username,
      encryptedData: newPassword.encryptedData,
      iv: newPassword.iv,
      authTag: newPassword.authTag
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error saving password' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { site, username, encryptedData, iv, authTag } = req.body;
    const { id } = req.params;
    
    const entry = await Password.findById(id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }
    
    if (entry.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    entry.site = site || entry.site;
    entry.username = username || entry.username;
    
    if (encryptedData && iv && authTag) {
      entry.encryptedData = encryptedData;
      entry.iv = iv;
      entry.authTag = authTag;
    }
    
    await entry.save();
    
    res.json({
      _id: entry._id,
      site: entry.site,
      username: entry.username,
      encryptedData: entry.encryptedData,
      iv: entry.iv,
      authTag: entry.authTag
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating password' });
  }
};

const deletePassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = await Password.findById(id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }
    
    if (entry.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    await entry.deleteOne();
    
    res.json({ id: req.params.id, message: 'Password deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting password' });
  }
};

module.exports = { getPasswords, addPassword, updatePassword, deletePassword };
