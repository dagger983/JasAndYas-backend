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

// API endpoint to handle payment success verification (callback from Razorpay)
app.post('/payment-success', (req, res) => {
  const { payment_id, order_id, signature } = req.body;

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

// Payment webhook to handle notifications from Razorpay
app.post('/payment-webhook', (req, res) => {
  const paymentDetails = req.body;

  // Validate the payment signature
  if (validatePaymentSignature(paymentDetails)) {
    // Process the payment and update the database
    res.status(200).send('Payment verified successfully');
  } else {
    res.status(400).send('Invalid payment signature');
  }
});

// Function to validate Razorpay webhook signature
function validatePaymentSignature(paymentDetails) {
  const { payment_id, order_id, signature } = paymentDetails;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  return generated_signature === signature;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
