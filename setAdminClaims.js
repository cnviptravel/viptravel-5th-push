const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Check if serviceAccountKey.json exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: serviceAccountKey.json is missing in the current directory.");
  console.error("Please download it from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key, and save it as serviceAccountKey.json in the project root.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// 2. Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 3. Get UID from command line arguments
const uid = process.argv[2];

if (!uid) {
  console.error("Error: Please provide your Firebase UID as an argument.");
  console.error("Usage: node setAdminClaims.js <YOUR_FIREBASE_UID>");
  process.exit(1);
}

// 4. Set Custom Claims
admin.auth().setCustomUserClaims(uid, { admin: true, superadmin: true })
  .then(() => {
    console.log(`✅ Successfully set { admin: true, superadmin: true } claims for UID: ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting custom claims:', error);
    process.exit(1);
  });
