const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const dotenv = require('dotenv');
const crypto = require('crypto');
const cors = require('cors'); // Import the cors package

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Enable CORS for all origins (you can customize this)
app.use(cors()); // Allows all domains to access your server

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

// API endpoint to handle payment verification (callback from Razorpay)
app.post('/payment-success', (req, res) => {
  const { payment_id, order_id, signature } = req.body;

  // Razorpay secret (from environment variables)
  const secret = process.env.RAZORPAY_KEY_SECRET;

  // Generate the expected signature using payment_id and order_id
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  // Verify the signature
  if (generated_signature === signature) {
    res.json({
      message: 'Payment successful',
      payment_id,
      order_id,
    });
  } else {
    res.status(400).json({
      error: 'Signature verification failed',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
