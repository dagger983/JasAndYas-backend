const express = require('express');
const { signup, getUsers } = require('../controllers/userController');

const router = express.Router();

router.post('/signup', signup);
router.get('/users', getUsers);

module.exports = router;
