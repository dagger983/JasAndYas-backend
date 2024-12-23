const express = require("express");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const mysql = require("mysql");
const catalyst = require("zcatalyst-sdk-node");
dotenv.config();

const app = express();
const port = 3306;

const cors = require("cors");

// CORS options configuration
const corsOptions = {
  origin: "*", // Allow all origins or specify the frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow all required HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Add necessary headers
};

// Use CORS middleware
app.options("*", cors(corsOptions)); // Handle preflight requests
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
  const query = "SELECT id, username, mobile, password , pin FROM users";

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
app.post("/adminData", (req, res) => {
  const {
    username,
    mobile,
    pickup_location_name,
    drop_location_name,
    price,
    OTP,
    members, // Add members to the request body
  } = req.body;

  // Validation for required fields
  if (
    !username ||
    !mobile ||
    !pickup_location_name ||
    !drop_location_name ||
    price === undefined ||
    !OTP ||
    members === undefined // Ensure members is provided
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required, including price and members" });
  }

  const query = `
    INSERT INTO adminData 
    (username, mobile, pickup_location_name, drop_location_name, price, OTP, members) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [username, mobile, pickup_location_name, drop_location_name, price, OTP, members], // Include members in the values
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
app.delete("/autoData/:id", (req, res) => {
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

const listenPort = process.env.X_ZOHO_CATALYST_LISTEN_PORT || port;

app.listen(listenPort, () => {
  console.log(`Server running on port ${listenPort}`);
});
