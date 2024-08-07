const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  loginHistory: [{
    dateTime: Date,
    userAgent: String
  }]
});

let User;

module.exports.initialize = function() {
  return new Promise((resolve, reject) => {
    // Connect to MongoDB
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(() => {
      // Once connected, create the model
      User = mongoose.model("User", userSchema); // Changed to "User"
      resolve();
    }).catch((err) => {
      reject(`Failed to connect to MongoDB: ${err.message}`);
    });

    // Error handling
    mongoose.connection.on('error', (err) => {
      reject(`Connection error: ${err.message}`);
    });
  });
};

module.exports.registerUser = function(userData) {
  return new Promise(async (resolve, reject) => {
    try {
      if (userData.password !== userData.password2) {
        return reject("Passwords do not match");
      }

      // Hash password
      const hash = await bcrypt.hash(userData.password, 10);
      userData.password = hash;

      // Create and save new user
      let newUser = new User(userData);
      await newUser.save();
      resolve();
    } catch (err) {
      if (err.code === 11000) {
        reject("User Name already taken");
      } else {
        reject(`There was an error creating the user: ${err.message}`);
      }
    }
  });
};

module.exports.checkUser = function(userName, password, userAgent) {
  return new Promise(async (resolve, reject) => {
    try {
      // Find user
      const user = await User.findOne({ userName: userName }).exec();
      if (!user) {
        return reject(`Unable to find user: ${userName}`);
      }

      // Compare password
      const result = await bcrypt.compare(password, user.password);
      if (!result) {
        return reject(`Incorrect Password for user: ${userName}`);
      }

      // Update login history
      if (user.loginHistory.length >= 8) {
        user.loginHistory.pop();
      }
      user.loginHistory.unshift({
        dateTime: new Date(),
        userAgent: userAgent
      });

      // Save user
      await user.save();
      resolve(user);
    } catch (err) {
      reject(`There was an error verifying the user: ${err.message}`);
    }
  });
};
