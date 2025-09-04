// server.js
import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { initDb } from './db.js';

dotenv.config();

const app = express();
app.use(express.json());

let db;

async function startServer() {
  db = await initDb();
  const users = db.collection('users');
  const tokens = db.collection('tokens');

  // Register user manually (optional)
  app.post('/register', async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

      const existing = await users.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Email already registered' });

      const id = uuidv4();
      await users.insertOne({ _id: id, name, email });
      res.json({ id, name, email });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate JWT token for user
  app.post('/token', async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

      let user = await users.findOne({ email });

      // If user doesn't exist, create them
      if (!user) {
        const id = uuidv4();
        await users.insertOne({ _id: id, name, email });
        user = { _id: id, name, email };
      }

      // Create short-lived JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '15m' }
      );

      await tokens.insertOne({ token, userId: user._id, createdAt: new Date() });

      // Print all tokens for this user
      const userTokens = await tokens.find({ userId: user._id }).toArray();
      console.log(`All tokens for user ${email}:`, userTokens);

      res.json({ token });
    } catch (err) {
      console.error('Token generation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Protected route example
  app.get('/me', async (req, res) => {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    try {
      const decoded = jwt.verify(auth, process.env.JWT_SECRET || 'defaultsecret');
      const user = await users.findOne(
        { _id: decoded.userId },
        { projection: { _id: 0 } }
      );
      res.json(user);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  const port = process.env.PORT || 3000;
  // Listen on all interfaces so other devices on your LAN can reach it
  app.listen(port, '0.0.0.0', () =>
    console.log(`Server running on http://0.0.0.0:${port}`)
  );
}

startServer();
