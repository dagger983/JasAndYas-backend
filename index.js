const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const cors = require('cors');
const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
dotenv.config();

const app = express();
const port = 3306;
const JWT_SECRET = process.env.JWT_SECRET || 'settle agama kadhalikatha bro life or wife ehh poidum';

const corsOptions = {
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow Authorization header
};
app.use(cors(corsOptions));

const db = mysql.createConnection({
  host: "bf9cyakdy8vjfwfzk6fu-mysql.services.clever-cloud.com",
  user: "ujrq82bmaixr8wwe",
  password: "FCdWBg9vGcnvkhWyEcwP",
  database: "bf9cyakdy8vjfwfzk6fu",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err);
    return;
  }
  console.log("Connected to database.");
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use(bodyParser.json());

app.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // Amount in paise
    currency: 'INR',
    receipt: `order_rcptid_${Math.random()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order', error);
    res.status(500).json({ error: 'Error creating Razorpay order', message: error.message });
  }
});

app.post('/signup', (req, res) => {
  const { username, mobile, password } = req.body;

  if (!username || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Insert plain-text password into the database
  const query = 'INSERT INTO users (username, mobile, password) VALUES (?, ?, ?)';
  db.query(query, [username, mobile, password], (err, result) => {
    if (err) {
      console.error('Error inserting user:', err);
      return res.status(500).json({ error: 'Failed to register user', details: err });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

app.post('/login', (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile and password are required' });
  }

  const query = 'SELECT * FROM users WHERE mobile = ?';
  db.query(query, [mobile], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ error: 'Failed to log in', details: err });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    const user = results[0];

    // Direct password comparison without hashing
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    // Send a welcome message with the username
    res.status(200).json({
      message: `Welcome, ${user.username}!`,
      username: user.username,
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
