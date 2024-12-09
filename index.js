const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const corsOptions = require('./config/corsOptions');

dotenv.config();

const app = express();
const port = 3306;

app.use(cors(corsOptions));
app.use(bodyParser.json());

app.use('/api', userRoutes);
app.use('/api', paymentRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
