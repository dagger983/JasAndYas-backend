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



app.post('/verify-payment', async (req, res) => {
  const { payment_id, order_id, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  // Log received data for debugging
  console.log('Received order_id:', order_id);
  console.log('Received payment_id:', payment_id);
  console.log('Received signature:', signature);

  try {
    // Generate the expected signature
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    // Log the generated signature for debugging
    console.log('Generated signature:', generated_signature);

    // Compare the generated signature with the received signature
    if (generated_signature !== signature) {
      return res.status(400).json({ success: false, message: 'Signature verification failed' });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(payment_id);

    // Check if payment status is captured
    if (payment.status === 'captured') {
      return res.json({ success: true, message: 'Payment verified successfully', payment });
    } else {
      return res.status(400).json({ success: false, message: 'Payment failed or not captured' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
