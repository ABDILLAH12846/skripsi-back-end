const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Ganti 'YOUR_PROJECT_ID' dengan ID proyek Google Cloud Anda
const projectId = "earnest-dogfish-426110-r6";

// Ganti dengan path ke file kunci JSON Anda
const keyFilename = path.join(__dirname, 'alizzah-storage.json');

const storage = new Storage({ projectId, keyFilename });

const bucketName = 'sma-it-al-izzah';

const bucket = storage.bucket(bucketName);

module.exports = bucket;
