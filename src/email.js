require('dotenv').config();
const express = require('express')
const nodemailer = require('nodemailer')
const {google} = require('googleapis')

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

const EMAIL = process.env.EMAIL;
const PORT = 4000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: EMAIL,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN
  },
  tls: {
    rejectUnauthorized: false
  }
});

app.post('/sendEmail', (req, res) => {
  const { email, text, html, subject } = req.body;

  // Message object
  let message = {
    from: `Ranveer Singh <${EMAIL}>`,
    to: email,
    subject: subject,
    text: text,
    html: html
  };

  transporter.sendMail(message, (err, info) => {
    if (err) {
      console.log('Error occurred. ' + err.message);
      res.status(500).json({
        success: false,
        msg: 'Something went wrong, email could not be sent!'
      });
      transporter.close();
      return;
    }
    res.status(200).json({ 
      success: true, 
      msg: 'Email sent successfully!' 
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}!`);
});