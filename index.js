const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const crypto = require('crypto');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Enable CORS for specific domains (security best practice)
const corsOptions = {
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions)); // Allows requests only from your frontend domain

// Initialize Razorpay with your keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Middleware to parse incoming requests
app.use(bodyParser.json());

// API endpoint to create an order
app.post('/create-order', async (req, res) => {
  const { amount } = req.body; // Amount should be sent from the client

  // Razorpay order options
  const options = {
    amount: amount * 100, // Convert amount to paise
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



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
