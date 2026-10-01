require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "seminar_hall_secret_jwt_key_2026";

app.use(cors());
app.use(express.json());
app.use(express.static("frontend"));

console.log("Starting Server with Idempotent Database Engine...");

/* ===============================
DATABASE CONNECTION & SCHEMA INIT
================================ */

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "seminarhallbooking",
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("MySQL Connected Successfully");
  initDatabaseTablesAndDefaultAdmin();
});

function initDatabaseTablesAndDefaultAdmin() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(100) NOT NULL,
      user_email VARCHAR(150) NOT NULL UNIQUE,
      user_phone VARCHAR(20),
      password VARCHAR(255) NOT NULL
    )
  `;

  const createAdminTable = `
    CREATE TABLE IF NOT EXISTS admin (
      admin_id INT AUTO_INCREMENT PRIMARY KEY,
      admin_name VARCHAR(100) NOT NULL,
      admin_email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )
  `;

  const createBookingsTable = `
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id INT AUTO_INCREMENT PRIMARY KEY,
      booking_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      event_name VARCHAR(200) NOT NULL,
      event_details TEXT,
      dept VARCHAR(100),
      status VARCHAR(20) DEFAULT 'Pending',
      user_id INT NOT NULL,
      hall_id INT DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `;

  const createHolidaysTable = `
    CREATE TABLE IF NOT EXISTS holidays (
      holiday_id INT AUTO_INCREMENT PRIMARY KEY,
      holiday_date DATE NOT NULL UNIQUE,
      holiday_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) DEFAULT 'College'
    )
  `;

  db.query(createUsersTable, (err) => {
    if (err) console.error("Users table init error:", err.message);
  });

  db.query(createAdminTable, (err) => {
    if (err) console.error("Admin table init error:", err.message);
    else seedDefaultAdmin();
  });

  db.query(createBookingsTable, (err) => {
    if (err) console.error("Bookings table init error:", err.message);
  });

  db.query(createHolidaysTable, (err) => {
    if (err) console.error("Holidays table init error:", err.message);
    else seedDefaultHolidays();
  });
}

/**
 * Idempotently seeds the default admin account with a bcrypt hashed password.
 */
function seedDefaultAdmin() {
  const adminEmail = "admin@mmcoe.edu.in";
  const checkSql = "SELECT * FROM admin WHERE admin_email = ?";

  db.query(checkSql, [adminEmail], async (err, results) => {
    if (err) {
      console.error("Check default admin error:", err.message);
      return;
    }

    if (results && results.length > 0) {
      console.log("Default admin account already exists. Skipping initialization.");
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const insertSql = "INSERT INTO admin (admin_name, admin_email, password) VALUES (?, ?, ?)";
      db.query(insertSql, ["System Admin", adminEmail, hashedPassword], (insertErr) => {
        if (insertErr) {
          if (insertErr.code === 'ER_DUP_ENTRY') {
            console.log("Default admin entry already exists.");
          } else {
            console.error("Seed default admin error:", insertErr.message);
          }
        } else {
          console.log("Default admin account created successfully.");
        }
      });
    } catch (e) {
      console.error("Bcrypt hash default admin error:", e);
    }
  });
}

/**
 * Idempotently seeds default holidays if none exist.
 */
function seedDefaultHolidays() {
  const checkSql = "SELECT COUNT(*) AS count FROM holidays";
  db.query(checkSql, (err, results) => {
    if (err) return;

    if (results && results[0] && results[0].count > 0) {
      return;
    }

    const seedSql = `
      INSERT IGNORE INTO holidays (holiday_date, holiday_name, category) VALUES
      ('2026-01-26', 'Republic Day', 'National'),
      ('2026-02-19', 'Chhatrapati Shivaji Maharaj Jayanti', 'State (Maharashtra)'),
      ('2026-03-04', 'Holi / Dhulivandan', 'State (Maharashtra)'),
      ('2026-03-20', 'Gudhi Padwa', 'State (Maharashtra)'),
      ('2026-03-31', 'Id-ul-Fitr (Ramzan Id)', 'National'),
      ('2026-04-14', 'Dr. Babasaheb Ambedkar Jayanti', 'National'),
      ('2026-05-01', 'Maharashtra Day', 'State (Maharashtra)'),
      ('2026-08-15', 'Independence Day', 'National'),
      ('2026-09-14', 'Ganesh Chaturthi', 'State (Maharashtra)'),
      ('2026-10-02', 'Mahatma Gandhi Jayanti', 'National'),
      ('2026-10-20', 'Dussehra (Vijaya Dashami)', 'National'),
      ('2026-11-08', 'Diwali (Laxmi Pujan)', 'National'),
      ('2026-12-25', 'Christmas', 'National'),
      ('2026-09-25', 'College Foundation Day', 'College');
    `;

    db.query(seedSql, (seedErr) => {
      if (!seedErr) {
        console.log("Default holidays seeded successfully.");
      }
    });
  });
}

/* ===============================
AUTHENTICATION & RBAC MIDDLEWARE
================================ */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required. Please log in." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token. Please log in again." });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Admin authorization required." });
  }
  next();
}

/* ===============================
SERVER PORT
================================ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

/* ===============================
TEST ROUTE
================================ */

app.get("/test", (req, res) => {
  res.send("Backend working safely");
});

/* ===============================
SIGNUP (BCRYPT HASHING)
================================ */

app.post("/signup", async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).send("Missing fields");
  }

  if (!email.endsWith("@mmcoe.edu.in")) {
    return res.send("Use college email (@mmcoe.edu.in)");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const targetRole = (role === "admin") ? "admin" : "user";

    if (targetRole === "user") {
      const sql = "INSERT INTO users(user_name,user_email,user_phone,password) VALUES (?,?,?,?)";
      db.query(sql, [name, email, phone || "", hashedPassword], (err) => {
        if (err) {
          console.error("Signup Error:", err.message);
          return res.send("User already exists");
        }
        res.send("User Registered Successfully");
      });
    } else {
      const sql = "INSERT INTO admin(admin_name,admin_email,password) VALUES (?,?,?)";
      db.query(sql, [name, email, hashedPassword], (err) => {
        if (err) {
          console.error("Admin Signup Error:", err.message);
          return res.send("Admin already exists");
        }
        res.send("Admin Registered Successfully");
      });
    }
  } catch (err) {
    console.error("Password Hashing Error:", err);
    res.status(500).send("Registration error");
  }
});

/* ===============================
LOGIN (BCRYPT COMPARE & JWT GENERATION)
================================ */

app.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password are required" });
  }

  const targetRole = (role === "admin") ? "admin" : "user";
  const sql = targetRole === "user"
    ? "SELECT * FROM users WHERE user_email=?"
    : "SELECT * FROM admin WHERE admin_email=?";

  db.query(sql, [email], async (err, result) => {
    if (err || result.length === 0) {
      return res.json({ success: false, message: "Invalid login" });
    }

    const account = result[0];
    const accountId = targetRole === "user" ? account.user_id : account.admin_id;
    const accountName = targetRole === "user" ? account.user_name : account.admin_name;

    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, account.password);
    } catch (e) {
      validPassword = false;
    }

    if (!validPassword && password === account.password) {
      validPassword = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        const updateSql = targetRole === "user"
          ? "UPDATE users SET password=? WHERE user_id=?"
          : "UPDATE admin SET password=? WHERE admin_id=?";
        db.query(updateSql, [newHash, accountId]);
        console.log(`Migrated legacy password to bcrypt for ${email}`);
      } catch (e) {
        console.error("Password migration failed:", e);
      }
    }

    if (!validPassword) {
      return res.json({ success: false, message: "Invalid login" });
    }

    const payload = {
      id: accountId,
      user_id: accountId,
      name: accountName,
      email: email,
      role: targetRole
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
    delete account.password;

    res.json({
      success: true,
      token: token,
      data: account,
      role: targetRole
    });
  });
});

/* ===============================
CALENDAR BOOKINGS (PUBLIC / APPROVED)
================================ */

app.get("/bookings", (req, res) => {
  const sql = `
    SELECT 
      b.booking_id,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.event_name,
      b.dept,
      u.user_name,
      u.user_phone
    FROM bookings b
    JOIN users u ON b.user_id=u.user_id
    WHERE b.status='Approved'
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Fetch bookings error:", err.message);
      return res.json([]);
    }
    res.json(result);
  });
});

/* ===============================
HOLIDAY MANAGEMENT APIs
================================ */

app.get("/holidays", (req, res) => {
  const sql = "SELECT * FROM holidays ORDER BY holiday_date ASC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch holidays error:", err.message);
      return res.json([]);
    }
    res.json(results || []);
  });
});

app.post("/holidays", authenticateToken, requireAdmin, (req, res) => {
  const { holiday_date, holiday_name, category } = req.body;
  if (!holiday_date || !holiday_name) {
    return res.status(400).send("Holiday date and name are required");
  }

  const sql = "INSERT INTO holidays (holiday_date, holiday_name, category) VALUES (?, ?, ?)";
  db.query(sql, [holiday_date, holiday_name, category || 'College'], (err) => {
    if (err) {
      console.error("Add holiday error:", err.message);
      return res.status(400).send("Holiday for this date already exists");
    }
    res.send("Holiday added successfully");
  });
});

app.put("/holidays/:id", authenticateToken, requireAdmin, (req, res) => {
  const holidayId = parseInt(req.params.id, 10);
  const { holiday_date, holiday_name, category } = req.body;

  if (!holidayId || !holiday_date || !holiday_name) {
    return res.status(400).send("Missing update fields");
  }

  const sql = "UPDATE holidays SET holiday_date=?, holiday_name=?, category=? WHERE holiday_id=?";
  db.query(sql, [holiday_date, holiday_name, category || 'College', holidayId], (err) => {
    if (err) {
      console.error("Update holiday error:", err.message);
      return res.status(500).send("Update failed");
    }
    res.send("Holiday updated successfully");
  });
});

app.delete("/holidays/:id", authenticateToken, requireAdmin, (req, res) => {
  const holidayId = parseInt(req.params.id, 10);
  if (!holidayId) return res.status(400).send("Holiday ID required");

  const sql = "DELETE FROM holidays WHERE holiday_id=?";
  db.query(sql, [holidayId], (err) => {
    if (err) {
      console.error("Delete holiday error:", err.message);
      return res.status(500).send("Delete failed");
    }
    res.send("Holiday deleted successfully");
  });
});

/* ===============================
HALL AVAILABILITY API
================================ */

app.get("/availability", (req, res) => {
  const dateStr = req.query.date;
  const targetHallId = parseInt(req.query.hall_id, 10) || 1;

  if (!dateStr) {
    return res.status(400).json({ success: false, message: "Date parameter required" });
  }

  const sql = `
    SELECT booking_id, start_time, end_time, event_name, dept, status
    FROM bookings
    WHERE booking_date = ? 
    AND hall_id = ? 
    AND status IN ('Approved', 'Pending')
    ORDER BY start_time ASC
  `;

  db.query(sql, [dateStr, targetHallId], (err, results) => {
    if (err) {
      console.error("Availability query error:", err.message);
      return res.status(500).json({ success: false, message: "Database query error" });
    }

    const occupiedSlots = (results || []).map(r => ({
      booking_id: r.booking_id,
      start: r.start_time.substring(0, 5),
      end: r.end_time.substring(0, 5),
      event: r.event_name,
      dept: r.dept,
      status: r.status
    }));

    res.json({
      success: true,
      date: dateStr,
      hall_id: targetHallId,
      occupiedSlots: occupiedSlots,
      operatingHours: { start: "08:00", end: "20:00" }
    });
  });
});

/* ===============================
BOOK SLOT (TRANSACTION SAFE, OVERLAP & HOLIDAY CHECK)
================================ */

app.post("/book", authenticateToken, (req, res) => {
  const { date, start, end, event, details, dept, user_id, hall_id } = req.body;

  const bookingUserId = req.user ? req.user.id : (user_id || 1);
  const targetHallId = parseInt(hall_id, 10) || 1;

  if (!date || !start || !end || !event || !dept) {
    return res.status(400).send("Missing required booking fields");
  }

  if (start >= end) {
    return res.status(400).send("End time must be after start time");
  }

  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Transaction Error:", transactionErr.message);
      return res.status(500).send("Booking transaction initialization failed");
    }

    const holidayCheckSql = "SELECT * FROM holidays WHERE holiday_date = ?";
    db.query(holidayCheckSql, [date], (hErr, hResults) => {
      if (hErr) {
        console.error("Holiday check error:", hErr.message);
        return db.rollback(() => res.status(500).send("Holiday verification failed"));
      }

      if (hResults && hResults.length > 0) {
        const hol = hResults[0];
        return db.rollback(() => {
          res.send(`Bookings are not allowed on holidays/campus closures: ${hol.holiday_name} (${hol.category})`);
        });
      }

      const checkSql = `
        SELECT * FROM bookings
        WHERE booking_date = ?
        AND hall_id = ?
        AND status IN ('Approved', 'Pending')
        AND (start_time < ? AND end_time > ?)
        FOR UPDATE
      `;

      db.query(checkSql, [date, targetHallId, end, start], (checkErr, results) => {
        if (checkErr) {
          console.error("Overlap Check Error:", checkErr.message);
          return db.rollback(() => res.status(500).send("Slot verification failed"));
        }

        if (results && results.length > 0) {
          return db.rollback(() => res.send("Slot already booked"));
        }

        const insertSql = `
          INSERT INTO bookings
          (booking_date, start_time, end_time, event_name, event_details, dept, user_id, hall_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;

        db.query(insertSql, [date, start, end, event, details || "", dept, bookingUserId, targetHallId], (insertErr) => {
          if (insertErr) {
            console.error("Insert Booking Error:", insertErr.message);
            return db.rollback(() => res.send("Booking failed"));
          }

          db.commit((commitErr) => {
            if (commitErr) {
              console.error("Commit Error:", commitErr.message);
              return db.rollback(() => res.send("Booking failed on commit"));
            }
            res.send("Booking request submitted");
          });
        });
      });
    });
  });
});

/* ===============================
USER BOOKINGS (OWN RECS / ADMIN ONLY)
================================ */

app.get("/userBookings/:id", authenticateToken, (req, res) => {
  const requestedId = parseInt(req.params.id, 10);

  if (req.user.role !== 'admin' && req.user.id !== requestedId) {
    return res.status(403).json({ success: false, message: "Unauthorized access to booking records" });
  }

  const sql = "SELECT * FROM bookings WHERE user_id=? ORDER BY booking_date";

  db.query(sql, [requestedId], (err, result) => {
    if (err) {
      console.error("Fetch user bookings error:", err.message);
      return res.json([]);
    }
    res.json(result);
  });
});

/* ===============================
ADMIN REQUESTS (ADMIN ONLY)
================================ */

app.get("/requests", authenticateToken, requireAdmin, (req, res) => {
  const sql = "SELECT * FROM bookings ORDER BY booking_id ASC";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Fetch requests error:", err.message);
      return res.json([]);
    }
    res.json(result);
  });
});

/* ===============================
APPROVE BOOKING (ADMIN ONLY)
================================ */

app.post("/approve", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send("Booking ID required");

  const sql = "UPDATE bookings SET status='Approved' WHERE booking_id=?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Approve error:", err.message);
      return res.status(500).send("Approve failed");
    }
    res.send("Booking Approved");
  });
});

/* ===============================
REJECT BOOKING (ADMIN ONLY)
================================ */

app.post("/reject", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send("Booking ID required");

  const sql = "UPDATE bookings SET status='Rejected' WHERE booking_id=?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Reject error:", err.message);
      return res.status(500).send("Reject failed");
    }
    res.send("Booking Rejected");
  });
});

/* ===============================
DELETE BOOKING (ADMIN ONLY)
================================ */

app.post("/deleteBooking", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send("Booking ID required");

  const sql = "DELETE FROM bookings WHERE booking_id=?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Delete error:", err.message);
      return res.status(500).send("Delete failed");
    }
    res.send("Booking deleted successfully");
  });
});