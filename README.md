# Seminar Hall Booking System

A web-based Seminar Hall Booking System designed to simplify the process of booking and managing seminar halls in a college. It allows users to check hall availability, submit booking requests, and manage their reservations, while administrators can manage bookings and holidays.

## Features

* **User Authentication:** Secure login and registration.
* **Role-Based Access:** Separate access for users and administrators.
* **Hall Booking:** Submit seminar hall booking requests.
* **Availability Checking:** Check hall availability before booking.
* **Conflict Prevention:** Prevent overlapping bookings.
* **Booking Management:** View and manage booking requests.
* **Holiday Management:** Administrators can add, update, and delete holidays.
* **Calendar View:** View bookings and holidays through a calendar.
* **Admin Dashboard:** Manage bookings and system information.

## Tech Stack

| Component         | Technology                       |
| ----------------- | -------------------------------- |
| Frontend          | HTML, CSS, JavaScript, Bootstrap |
| Calendar          | FullCalendar.js                  |
| Backend           | Node.js, Express.js              |
| Database          | MySQL                            |
| Authentication    | JWT                              |
| Password Security | bcrypt                           |
| Version Control   | Git, GitHub                      |

## Project Structure

```text
seminar-booking-system/
├── frontend/
│   ├── admin-dashboard.html
│   ├── admin.html
│   ├── booking.html
│   ├── calendar.html
│   ├── dashboard.html
│   ├── holidays.js
│   ├── index.html
│   ├── login.html
│   ├── script.js
│   ├── style.css
│   └── seminarHall.jpeg
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PRANJALKHAIRNAR07/seminar-hall-booking-system.git
```

### 2. Navigate to the Project

```bash
cd seminar-hall-booking-system
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory using `.env.example` as a reference.

Add your local MySQL database configuration and other required environment variables. Do not upload your `.env` file or share credentials publicly.

### 5. Set Up the Database

* Install and start MySQL.
* Create the database required by the application.
* Configure the database connection in your `.env` file.

Follow any database initialization instructions or scripts included in the project.

### 6. Start the Application

```bash
npm start
```

Open the application at:

```text
http://localhost:5000
```

## Security

* Passwords are hashed using bcrypt.
* JWT is used for authentication.
* Protected routes use authentication and role-based authorization.
* Environment variables are used for sensitive configuration.

## Future Scope

* Email notifications for booking updates.
* Enhanced booking reports and analytics.
* Improved mobile responsiveness.
* Additional booking and approval workflows.

## Contributors

**Pranjal Khairnar**
Computer Engineering Student

## License

This project is currently available for educational purposes. Add a license if you intend to permit reuse or distribution under specific terms.
