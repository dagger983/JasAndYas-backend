const express = require("express");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const mysql = require("mysql2");
const catalyst = require("zcatalyst-sdk-node");
dotenv.config();

const app = express();
const port = 33060;

const cors = require("cors");

const corsOptions = {
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true 
};

app.options("*", cors(corsOptions)); 
app.use(cors(corsOptions));


const db = mysql.createConnection({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT,
  waitForConnections: true,
  connectionLimit: 10,  // Adjust as needed
  queueLimit: 0
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

app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // Amount in paise
    currency: "INR",
    receipt: `order_rcptid_${Math.random()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order", error);
    res
      .status(500)
      .json({ error: "Error creating Razorpay order", message: error.message });
  }
});
app.post("/signup", (req, res) => {
  const { username, mobile, password, pin } = req.body;

  if (!username || !mobile || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "INSERT INTO users (username, mobile, password, pin) VALUES (?, ?, ?,?)";
  db.query(query, [username, mobile, password, pin], (err, result) => {
    if (err) {
      console.error("Error inserting user:", err);
      return res
        .status(500)
        .json({ error: "Failed to register user", details: err });
    }
    res.status(201).json({ message: "User registered successfully" });
  });
});
app.get("/users", (req, res) => {
  const query = "SELECT id, username, mobile, password ,wallet , pin FROM users";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch users", details: err });
    }

    res.status(200).json(results);
  });
});

app.put("/users/:id/wallet", (req, res) => {
  const userId = req.params.id;
  const { amount } = req.body;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Failed to start transaction" });
    }

    const getBalanceQuery = "SELECT wallet FROM users WHERE id = ?";
    
    db.query(getBalanceQuery, [userId], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error fetching wallet balance:", err);
          res.status(500).json({ error: "Failed to fetch wallet balance" });
        });
      }

      if (results.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: "User not found" });
        });
      }

      const currentBalance = results[0].wallet;

      if (currentBalance < amount) {
        return db.rollback(() => {
          res.status(400).json({ error: "Insufficient wallet balance" });
        });
      }

      // Step 3: Deduct the amount
      const updateWalletQuery = "UPDATE users SET wallet = wallet - ? WHERE id = ?";
      db.query(updateWalletQuery, [amount, userId], (err, updateResults) => {
        if (err) {
          return db.rollback(() => {
            console.error("Error updating wallet:", err);
            res.status(500).json({ error: "Failed to update wallet" });
          });
        }

        if (updateResults.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ error: "User not found" });
          });
        }

        // Step 4: Commit transaction
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error committing transaction:", err);
              res.status(500).json({ error: "Failed to commit transaction" });
            });
          }

          res.status(200).json({ message: "Amount deducted successfully" });
        });
      });
    });
  });
});


app.post("/adminData", (req, res) => {
  const {
    username,
    mobile,
    pickup_location_name,
    drop_location_name,
    price,
    OTP,
    members,
    mode // Add members to the request body
  } = req.body;

  // Validation for required fields
  if (
    !username ||
    !mobile ||
    !pickup_location_name ||
    !drop_location_name ||
    price === undefined ||
    !OTP ||
    !mode ||
    members === undefined // Ensure members is provided
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required, including price and members" });
  }

  const query = `
    INSERT INTO adminData 
    (username, mobile, pickup_location_name, drop_location_name, price, OTP, members,mode) 
    VALUES (?, ?, ?, ?, ?, ?, ?,?)
  `;

  db.query(
    query,
    [username, mobile, pickup_location_name, drop_location_name, price, OTP, members,mode], 
    (err, result) => {
      if (err) {
        console.error("Error inserting data into adminData:", err);
        return res
          .status(500)
          .json({ error: "Failed to add data", details: err });
      }

      console.log(`Data inserted successfully with ID: ${result.insertId}`);
      return res
        .status(201)
        .json({ message: "Data added successfully", id: result.insertId });
    }
  );
});
app.delete("/adminData/:id", (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID is required to delete a record" });
  }

  const query = `DELETE FROM adminData WHERE id = ?`;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting data from adminData:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete data", details: err });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No record found with the specified ID" });
    }

    console.log(`Record with ID: ${id} deleted successfully`);
    return res.status(200).json({ message: "Record deleted successfully" });
  });
});
app.get("/adminData", (req, res) => {
  const query = "SELECT * FROM adminData";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data from adminData:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch data", details: err });
    }

    res.status(200).json(results);
  });
});
app.post("/autoData", (req, res) => {
  const { Driver, Mobile, Password } = req.body;

  if (!Driver || !Mobile || !Password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "INSERT INTO autoData (Driver, Mobile, Password) VALUES (?, ?, ?)";
  db.query(query, [Driver, Mobile, Password], (err, result) => {
    if (err) {
      console.error("Error inserting driver:", err);
      return res
        .status(500)
        .json({ error: "Failed to add driver", details: err });
    }

    res
      .status(201)
      .json({ message: "Driver added successfully", id: result.insertId });
  });
});
app.get("/autoData", (req, res) => {
  const query = "SELECT id, Driver, Mobile, Password FROM autoData";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching drivers:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch drivers", details: err });
    }

    res.status(200).json(results);
  });
});
app.put("/autoData/:id", (req, res) => {
  const { id } = req.params;
  const { Driver, Mobile, Password } = req.body;

  if (!Driver || !Mobile || !Password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "UPDATE autoData SET Driver = ?, Mobile = ?, Password = ? WHERE id = ?";
  db.query(query, [Driver, Mobile, Password, id], (err, result) => {
    if (err) {
      console.error("Error updating driver:", err);
      return res
        .status(500)
        .json({ error: "Failed to update driver", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.status(200).json({ message: "Driver updated successfully" });
  });
});
app.delete("/autoData/:id", async  (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM autoData WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting driver:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete driver", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.status(200).json({ message: "Driver deleted successfully" });
  });
});
app.post("/rideData", (req, res) => {
  const {
    customer,
    mobile,
    pickup_location,
    drop_location,
    auto_driver,
    driver_mobile,
    price,
    OTP,
    members, // Add members to the request body
  } = req.body;

  // Check if all required fields are provided, including OTP and members
  if (
    !customer ||
    !mobile ||
    !pickup_location ||
    !drop_location ||
    !auto_driver ||
    !driver_mobile ||
    !price ||
    !OTP ||
    members === undefined // Ensure members is included in the request body
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required, including members and OTP" });
  }

  const query = `
    INSERT INTO rideData 
    (customer, mobile, pickup_location, drop_location, auto_driver, driver_mobile, price, otp, members) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      customer,
      mobile,
      pickup_location,
      drop_location,
      auto_driver,
      driver_mobile,
      price, // Insert the provided price value
      OTP, // Insert the OTP received in the request
      members, // Insert members value
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting ride data:", err);
        return res
          .status(500)
          .json({ error: "Failed to add ride data", details: err });
      }

      res.status(201).json({
        message: "Ride Booked successfully",
        id: result.insertId,
        data: {
          customer,
          mobile,
          pickup_location,
          drop_location,
          auto_driver,
          driver_mobile,
          price, // Include price in the response data
          OTP, // Include OTP in the response (optional)
          members, // Include members in the response data
        },
      });
    }
  );
});

app.get("/rideData", (req, res) => {
  const query = "SELECT * FROM rideData";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching rides:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch rides", details: err });
    }

    res.status(200).json(results);
  });
});
app.get("/rideData/:id", (req, res) => {
  const { id } = req.params;

  const query = "SELECT * FROM rideData WHERE id = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error fetching ride:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch ride", details: err });
    }

    if (!result.length) {
      return res.status(404).json({ error: "Ride not found" });
    }

    res.status(200).json(result[0]);
  });
});
app.delete("/rideData/:id", (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM rideData WHERE id = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting ride:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete ride", details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ride not found" });
    }

    res.status(200).json({ message: "Ride deleted successfully" });
  });
});

app.post("/otp", (req, res) => {
  const {
    customer,
    mobile,
    pickup_location,
    drop_location,
    auto_driver,
    driver_mobile,
    price,
    OTP,
    members, // Add members to the request body
  } = req.body;

  // Check if all required fields are provided, including OTP and members
  if (
    !customer ||
    !mobile ||
    !pickup_location ||
    !drop_location ||
    !auto_driver ||
    !driver_mobile ||
    !price ||
    !OTP ||
    members === undefined // Ensure members is included in the request body
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required, including members and OTP" });
  }

  const query = `INSERT INTO otp_ok (customer, mobile, pickup_location, drop_location, auto_driver, driver_mobile, price, OTP, members, created_at, updated_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

  db.query(
    query,
    [
      customer,
      mobile,
      pickup_location,
      drop_location,
      auto_driver,
      driver_mobile,
      price,
      OTP,
      members, // Insert members value
    ],
    (err, result) => {
      if (err) {
        res.status(500).json({ message: "Error inserting data", error: err });
      } else {
        res
          .status(200)
          .json({ message: "OTP record created successfully", data: result });
      }
    }
  );
});

app.get("/otp", (req, res) => {
  const query = "SELECT * FROM otp_ok";

  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ message: "Error fetching data", error: err });
    } else {
      res.status(200).json(result);
    }
  });
});

app.put("/otp/:id", (req, res) => {
  const { id } = req.params;
  const { OTP } = req.body; // The OTP provided by the user for verification

  const query = "UPDATE otp_ok SET OTP = ?, updated_at = NOW() WHERE id = ?";

  db.query(query, [OTP, id], (err, result) => {
    if (err) {
      res.status(500).json({ message: "Error updating OTP", error: err });
    } else {
      res
        .status(200)
        .json({ message: "OTP updated successfully", data: result });
    }
  });
});

app.delete("/otp/:id", (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM otp_ok WHERE id = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      res
        .status(500)
        .json({ message: "Error deleting OTP record", error: err });
    } else {
      res
        .status(200)
        .json({ message: "OTP record deleted successfully", data: result });
    }
  });
});

app.post('/drivers_login', (req, res) => {
  const { driver_name, mobile} = req.body;
  const query = 'INSERT INTO drivers_login (driver_name, mobile) VALUES (?, ?)';

  db.query(query, [driver_name, mobile], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to create driver login', error: err });
    }
    res.status(201).json({ message: 'Driver login created successfully', id: result.insertId });
  });
});

app.get('/drivers_login', (req, res) => {
  const query = 'SELECT * FROM drivers_login';

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch driver logins', error: err });
    }
    res.status(200).json(result);
  });
});

app.post('/drivers_logout', (req, res) => {
  const { driver_name, mobile} = req.body;
  const query = 'INSERT INTO drivers_logout (driver_name, mobile) VALUES (?, ?)';

  db.query(query, [driver_name, mobile, ], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to create driver logout', error: err });
    }
    res.status(201).json({ message: 'Driver logout created successfully', id: result.insertId });
  });
});

app.get('/drivers_logout', (req, res) => {
  const query = 'SELECT * FROM drivers_logout';

  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch driver logouts', error: err });
    }
    res.status(200).json(result);
  });
});

app.get('/api/categories', (req, res) => {
  const query = 'SELECT id, name, image_url FROM categories';

  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ message: 'Database query failed', error: err });
      }
      res.json(results); // Send the categories data in the response
  });
});

app.post('/api/categories', (req, res) => {
  const { name, image_url } = req.body;

  // Validate input
  if (!name || !image_url) {
    return res.status(400).json({ message: 'Name and image URL are required' });
  }

  // Insert new category into MySQL database
  const query = 'INSERT INTO categories (name, image_url) VALUES (?, ?)';
  db.query(query, [name, image_url], (err, result) => {
    if (err) {
      console.error('Error inserting category:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Send the newly added category back as response
    res.status(201).json({
      message: 'Category added successfully',
      category: {
        id: result.insertId, // The ID of the newly inserted category
        name,
        image_url,
      },
    });
  });
});

app.post("/products", (req, res) => {
  const { name, brand, price, category, keyword, image_url1, image_url2, image_url3, image_url4 } = req.body;
  const sql = "INSERT INTO products (name, brand, price, category, keyword, image_url1, image_url2, image_url3, image_url4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [name, brand, price, category, keyword, image_url1, image_url2, image_url3, image_url4], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Product created", id: result.insertId });
  });
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
  });
});

app.get("/products/:id", (req, res) => {
  db.query("SELECT * FROM products WHERE id = ?", [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: "Product not found" });
      res.json(results[0]);
  });
});


app.put("/products/:id", (req, res) => {
  const { name, brand, price, category, keyword, image_url1, image_url2, image_url3, image_url4 } = req.body;
  const sql = "UPDATE products SET name=?, brand=?, price=?, category=?, keyword=?, image_url1=?, image_url2=?, image_url3=?, image_url4=? WHERE id=?";
  db.query(sql, [name, brand, price, category, keyword, image_url1, image_url2, image_url3, image_url4, req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
      res.json({ message: "Product updated" });
  });
});


app.delete("/products/:id", (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Product not found" });
      res.json({ message: "Product deleted" });
  });
});


app.post('/user-expenses', (req, res) => {
  const {
    username,
    address,
    contact_number,
    temporary_contact_number,
    spend,
    product_brand,
    product_price,
    quantity,
    category_specific_details, // New field
  } = req.body;

  const query = `
    INSERT INTO user_expense (
      username,
      address,
      contact_number,
      temporary_contact_number,
      spend,
      product_brand,
      product_price,
      quantity,
      category_specific_details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    username,
    address,
    contact_number,
    temporary_contact_number,
    spend,
    product_brand || null,
    product_price || null,
    quantity || null,
    category_specific_details || null,
  ];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).send({ id: result.insertId, message: 'User expense created successfully' });
  });
});

app.get('/user-expenses', (req, res) => {
  db.query('SELECT * FROM user_expense', (err, results) => {
      if (err) return res.status(500).send(err);
      res.status(200).send(results);
  });
});

app.post("/update-wallet", async (req, res) => {
  const { id, mobile, amount } = req.body;

  if (!id || !mobile || amount === undefined) {
    return res.status(400).json({ error: "Invalid request payload" });
  }

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      db.beginTransaction((err) => (err ? reject(err) : resolve()));
    });

    // Fetch existing wallet balance with row lock
    const results = await new Promise((resolve, reject) => {
      db.query(
        "SELECT wallet FROM users WHERE id = ? AND mobile = ? FOR UPDATE",
        [id, mobile],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    if (results.length === 0) {
      await new Promise((resolve, reject) => db.rollback(() => resolve()));
      return res.status(404).json({ error: "User not found" });
    }

    let currentBalance = results[0].wallet || 0; // Handle NULL values
    let newWalletBalance = currentBalance + amount;

    // Update wallet balance
    await new Promise((resolve, reject) => {
      db.query(
        "UPDATE users SET wallet = ? WHERE id = ? AND mobile = ?",
        [newWalletBalance, id, mobile],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.commit((err) => (err ? reject(err) : resolve()));
    });

    return res.status(200).json({
      message: "Wallet updated successfully",
      mobile: mobile,
      wallet: newWalletBalance,
    });
  } catch (error) {
    console.error("Error updating wallet:", error);
    await new Promise((resolve, reject) => db.rollback(() => resolve()));
    return res.status(500).json({ error: "Server error" });
  }
});


app.post("/ad_video", (req, res) => {
  const { video } = req.body;
  const sql = "INSERT INTO ad_video (video) VALUES (?)";
  db.query(sql, [video], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Failed to add video" });
    } else {
      res.status(201).json({ id: result.insertId, video });
    }
  });
});

app.get("/ad_video", (req, res) => {
  const sql = "SELECT * FROM ad_video";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch videos" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.delete("/ad_video/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM ad_video WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Failed to delete video" });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: "Video not found" });
    } else {
      res.status(200).json({ message: "Video deleted successfully" });
    }
  });
});

app.get('/locations', async (req, res) => {
  const { search } = req.query;

  try {
    let query = 'SELECT * FROM predefined_locations';
    let values = [];

    if (search) {
      query = 'SELECT * FROM predefined_locations WHERE name LIKE ?';
      values = [`%${search}%`];
    }

    // Ensure db.execute() is used with a promise
    const [results] = await db.promise().execute(query, values);

    // Ensure results is an array before sending it
    if (!Array.isArray(results)) {
      throw new Error('Unexpected database response format');
    }

    res.json(results);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Error fetching locations', 
      details: error.message 
    });
  }
});


app.get("/locations/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM predefined_locations WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Location not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/locations", async (req, res) => {
  const { name, latitude, longitude } = req.body;
  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [result] = await db.query("INSERT INTO predefined_locations (name, latitude, longitude) VALUES (?, ?, ?)", 
    [name, latitude, longitude]);

    res.status(201).json({ id: result.insertId, name, latitude, longitude });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/locations/:id", async (req, res) => {
  const { name, latitude, longitude } = req.body;

  try {
    const [result] = await db.query("UPDATE predefined_locations SET name = ?, latitude = ?, longitude = ? WHERE id = ?", 
    [name, latitude, longitude, req.params.id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Location not found" });

    res.json({ id: req.params.id, name, latitude, longitude });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/locations/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM predefined_locations WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Location not found" });

    res.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});



const listenPort = process.env.X_ZOHO_CATALYST_LISTEN_PORT || port;

app.listen(listenPort, () => {
  console.log(`Server running on port ${listenPort}`);
});
