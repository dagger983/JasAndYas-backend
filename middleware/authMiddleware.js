const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwt'); // Import JWT_SECRET from the config

// Middleware to check if the user is authenticated
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Verify the token
    req.user = decoded; // Attach user information to the request object
    next(); // Continue to the next middleware or route handler
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticate;
