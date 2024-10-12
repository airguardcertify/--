const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost/expiry_reminder', { useNewUrlParser: true, useUnifiedTopology: true });

// Create a schema for the user data
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: String,
  expiryDate: Date
});

const User = mongoose.model('User', userSchema);

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

// API endpoint to register a new user
app.post('/register', async (req, res) => {
  try {
    const { name, email, phoneNumber, expiryDate } = req.body;
    const user = new User({ name, email, phoneNumber, expiryDate });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Function to send reminder email
function sendReminderEmail(user) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: user.email,
    subject: 'Expiry Date Reminder',
    text: `Hello ${user.name}, this is a reminder that your expiry date is approaching on ${user.expiryDate.toDateString()}.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

// Schedule a daily check for expiring items
cron.schedule('0 0 * * *', async () => {
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  try {
    const usersToRemind = await User.find({
      expiryDate: { $gte: today, $lte: threeDaysLater }
    });

    usersToRemind.forEach(user => {
      sendReminderEmail(user);
    });
  } catch (error) {
    console.log('Error checking for expiring items:', error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});