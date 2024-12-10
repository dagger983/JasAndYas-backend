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

const cors = require('cors');

// Allow all origins or specify only your frontend origin
const corsOptions = {
  origin: '*', // You can specify your frontend URL, e.g., "http://localhost:3000"
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Route to create Razorpay order
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

  const query = 'INSERT INTO users (username, mobile, password) VALUES (?, ?, ?)';
  db.query(query, [username, mobile, password], (err, result) => {
    if (err) {
      console.error('Error inserting user:', err);
      return res.status(500).json({ error: 'Failed to register user', details: err });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});



app.get('/users', (req, res) => {
  const query = 'SELECT id, username, mobile, password FROM users';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users', details: err });
    }

    res.status(200).json(results); 
  });
});


// POST API to add a new admin record
app.post('/adminData', (req, res) => {
  const {
    username, 
    mobile, 
    pickup_location_name, 
    pickup_latitude, 
    pickup_longitude, 
    drop_location_name, 
    drop_latitude, 
    drop_longitude
  } = req.body;

  if (!username || !mobile || !pickup_location_name || !pickup_latitude || !pickup_longitude || !drop_location_name || !drop_latitude || !drop_longitude) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = `
    INSERT INTO adminData 
    (username, mobile, pickup_location_name, pickup_latitude, pickup_longitude, drop_location_name, drop_latitude, drop_longitude) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [
    username, 
    mobile, 
    pickup_location_name, 
    pickup_latitude, 
    pickup_longitude, 
    drop_location_name, 
    drop_latitude, 
    drop_longitude
  ], (err, result) => {
    if (err) {
      console.error('Error inserting data into adminData:', err);
      return res.status(500).json({ error: 'Failed to add data', details: err });
    }

    console.log(`Data inserted successfully with ID: ${result.insertId}`);
    return res.status(201).json({ message: 'Data added successfully', id: result.insertId });
  });
});


// GET API to retrieve all admin records
app.get('/adminData', (req, res) => {
  const query = 'SELECT * FROM adminData';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data from adminData:', err);
      return res.status(500).json({ error: 'Failed to fetch data', details: err });
    }

    res.status(200).json(results);
  });
});

// POST API to add a new driver
app.post('/autoData', (req, res) => {
  const { Driver, Mobile, Password } = req.body;

  if (!Driver || !Mobile || !Password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = 'INSERT INTO autoData (Driver, Mobile, Password) VALUES (?, ?, ?)';
  db.query(query, [Driver, Mobile, Password], (err, result) => {
    if (err) {
      console.error('Error inserting driver:', err);
      return res.status(500).json({ error: 'Failed to add driver', details: err });
    }

    res.status(201).json({ message: 'Driver added successfully', id: result.insertId });
  });
});

// GET API to retrieve all drivers
app.get('/autoData', (req, res) => {
  const query = 'SELECT id, Driver, Mobile, Password FROM autoData';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching drivers:', err);
      return res.status(500).json({ error: 'Failed to fetch drivers', details: err });
    }

    res.status(200).json(results);
  });
});

// PUT API to update a driver's details
app.put('/autoData/:id', (req, res) => {
  const { id } = req.params;
  const { Driver, Mobile, Password } = req.body;

  if (!Driver || !Mobile || !Password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = 'UPDATE autoData SET Driver = ?, Mobile = ?, Password = ? WHERE id = ?';
  db.query(query, [Driver, Mobile, Password, id], (err, result) => {
    if (err) {
      console.error('Error updating driver:', err);
      return res.status(500).json({ error: 'Failed to update driver', details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.status(200).json({ message: 'Driver updated successfully' });
  });
});

// DELETE API to remove a driver
app.delete('/autoData/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM autoData WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting driver:', err);
      return res.status(500).json({ error: 'Failed to delete driver', details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.status(200).json({ message: 'Driver deleted successfully' });
  });
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});