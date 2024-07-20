const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Inisialisasi Google Cloud Storage
const storage = new Storage({
  projectId: "earnest-dogfish-426110-r6",
  keyFilename: path.join(__dirname, 'abdillah.json'),
});

// Tentukan bucket yang akan digunakan
const bucket = storage.bucket('sma-it-al-izzah');

// Konfigurasi multer untuk menggunakan Google Cloud Storage
const multerGoogleStorage = require('multer-google-storage').storageEngine({
  bucket: 'sma-it-al-izzah',
  projectId: "earnest-dogfish-426110-r6",
  keyFilename: path.join(__dirname, 'abdillah.json'),
  destination: (req, file, cb) => {
    cb(null, 'uploads/' + Date.now() + '-' + file.originalname);
  },
  acl: 'publicRead', // Buat file bisa diakses publik
});

// Konfigurasi multer
const upload = multer({
  storage: multerGoogleStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Batasi ukuran file maksimal 10MB
  fileFilter: (req, file, cb) => {
    // Filter jenis file yang diizinkan (misalnya hanya gambar)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File yang diunggah harus berupa gambar'), false);
    }
  },
});

module.exports = upload;
