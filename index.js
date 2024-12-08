const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const cors = require('cors');
const mysql = require("mysql");
const bcrypt = require('bcrypt');
dotenv.config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
const port = 3306;
const JWT_SECRET = process.env.JWT_SECRET || 'settle agama kadhalikatha bro life or wife ehh poidum';

const corsOptions = {
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
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
    console.error("Database connection failed: ");
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
    amount: amount * 100,
    currency: 'INR',
    receipt: `order_rcptid_${Math.random()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order', error);
    res.status(500).json({
      error: 'Error creating Razorpay order',
      message: error.message,
    });
  }
});
app.post('/signup', async (req, res) => {
  const { username, mobile, password } = req.body;

  if (!username || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, mobile, password) VALUES (?, ?, ?)';
    db.query(query, [username, mobile, hashedPassword], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Failed to register user' });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login endpoint with JWT generation
app.post('/login', (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile and password are required' });
  }

  const query = 'SELECT * FROM users WHERE mobile = ?';
  db.query(query, [mobile], async (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ error: 'Failed to log in' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    const user = results[0];

    try {
      // Compare the provided password with the hashed password in the database
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid mobile or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, mobile: user.mobile },
        JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
      );

      res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      console.error('Error comparing password:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  });
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET); // Extract token from Bearer
    req.user = decoded; // Attach user information to the request
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Example of a protected route
app.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Access granted', user: req.user });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
