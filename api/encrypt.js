// api/encrypt.js
const fernet = require('fernet');

export default function handler(req, res) {
  // Load the key securely from Environment Variables, NEVER hardcode it
  const stringKey = process.env.FERNET_SECRET; 
  const secret = new fernet.Secret(stringKey);
  
  const payload = {
      name: "armx",
      amount: 65
  };

  const jsonString = JSON.stringify(payload);
  
  const token = new fernet.Token({ secret: secret });
  const encryptedToken = token.encode(jsonString);

  // Send the encrypted token back to the frontend
  res.status(200).json({ token: encryptedToken });
}
