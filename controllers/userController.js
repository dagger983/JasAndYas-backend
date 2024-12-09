const db = require('../config/db');

const signup = (req, res) => {
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
};

const getUsers = (req, res) => {
  const query = 'SELECT id, username, mobile, password FROM users'; // Includes password

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users', details: err });
    }

    res.status(200).json(results); // Return the list of users including passwords
  });
};

module.exports = { signup, getUsers };
