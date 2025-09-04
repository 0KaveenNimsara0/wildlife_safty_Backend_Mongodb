const admin = require('firebase-admin');
const path = require('path');

// Replace 'your-service-account-file.json' with the actual filename of your Firebase service account JSON file
const serviceAccount = require(path.join(__dirname, './src/assets/wildlifesafty-firebase-adminsdk-fbsvc-91a2ee6cf3.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://wildlifesafty-default-rtdb.firebaseio.com"
});

module.exports = admin;
