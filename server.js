const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const admin = require('firebase-admin');
const User = require('./models/User'); // Import the User model
const ticketRoutes = require('./routes/ticketRoutes'); // Import the ticket routes
const eventRoutes = require('./routes/eventRoutes'); // Import the event routes

// Debugging step: print out environment variables to verify they're being loaded
console.log('GCLOUD_PROJECT_ID:', process.env.GCLOUD_PROJECT_ID);
console.log('GCLOUD_PRIVATE_KEY:', process.env.GCLOUD_PRIVATE_KEY);
console.log('GCLOUD_CLIENT_EMAIL:', process.env.GCLOUD_CLIENT_EMAIL);

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.GCLOUD_PROJECT_ID,
  privateKey: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'), // Make sure newlines are replaced
  clientEmail: process.env.GCLOUD_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (images) from the "public/images" directory
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err));

// 🔹 PUBLIC ROUTE: Handle User Authentication and Creation
app.post('/api/users', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1]; // Extract token from header

  if (!token) {
    return res.status(400).json({ error: 'Authentication token is missing' });
  }

  try {
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Decoded Token:', decodedToken);

    const firebaseUID = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || 'Unknown User'; // Use Firebase user's name or set default name

    // Check if the user already exists in the database
    let user = await User.findOne({ firebaseUID });

    if (!user) {
      // If the user does not exist, create a new user
      user = new User({
        firebaseUID,
        email,
        name,
      });
      await user.save();
      console.log('✅ New user created:', user);
    } else {
      console.log('✅ Existing user found:', user);
    }

    // Respond with the user's data
    return res.json({ message: 'Authenticated successfully', user });

  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// 🔹 ROUTES
// Event routes
app.use('/api/events', eventRoutes);

// Ticket routes
app.use('/api/tickets', ticketRoutes); // This will handle the POST request for creating tickets

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
