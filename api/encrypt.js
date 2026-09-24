// api/encrypt.js
const fernet = require('fernet');

export default function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  // Load secret
  const stringKey = process.env.FERNET_SECRET; 
  if (!stringKey) {
    return res.status(500).json({ error: 'Server missing encryption key' });
  }
  
  const secret = new fernet.Secret(stringKey);
  const { action, token, payload } = req.body;

  try {
    if (action === 'encrypt') {
      // 1. Encrypting data
      const dataToEncrypt = payload || { name: "armx", amount: 65 };
      const jsonString = JSON.stringify(dataToEncrypt);
      
      const fToken = new fernet.Token({ secret: secret });
      const encryptedToken = fToken.encode(jsonString);
      
      return res.status(200).json({ token: encryptedToken, result: encryptedToken });

    } else if (action === 'decrypt') {
      // 2. Decrypting data
      if (!token) return res.status(400).json({ error: 'No token provided' });
      
      // We pass the token received from the frontend into the Fernet instance
      const fToken = new fernet.Token({ secret: secret, token: token, ttl: 0 });
      const decryptedString = fToken.decode();
      const parsedObject = JSON.parse(decryptedString);
      
      return res.status(200).json({ result: parsedObject });

    } else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error("Crypto Error:", error);
    return res.status(500).json({ error: 'Encryption/Decryption failed' });
  }
}
