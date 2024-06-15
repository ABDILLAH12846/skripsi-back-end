// app.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const app = express();
const port = 8000;

const db = mysql.createConnection({
  host: '35.192.154.48', // Nama host dari database Anda
  user: 'root',      // Nama pengguna dari database Anda
  password: 'zakyirhamna',  // Kata sandi dari database Anda
  database: 'al-izzah' // Nama database Anda
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database as id ' + db.threadId);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Route untuk home page
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.get('/guru', (req, res) => {
  const sql = `
  SELECT 
  guru.*,
  COALESCE(GROUP_CONCAT(mata_pelajaran.nama SEPARATOR ', '), '[]') AS matapelajaran
  FROM 
      guru
  LEFT JOIN 
      mata_pelajaran ON guru.nip = mata_pelajaran.nip
      GROUP BY 
      guru.nip;
  `;
  ;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get('/guru/:nip', (req, res) => {
  const { nip } = req.params;
  const sql = `
    SELECT 
        guru.*,
        COALESCE(GROUP_CONCAT(mata_pelajaran.nama SEPARATOR ', '), '') AS matapelajaran
    FROM 
        guru
    LEFT JOIN 
        mata_pelajaran ON guru.nip = mata_pelajaran.nip
    WHERE 
        guru.nip = ?
    GROUP BY 
        guru.nip;
  `;
  
  db.query(sql, [nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Guru dengan NIP tersebut tidak ditemukan' });
    }
    res.json(results[0]);
  });
});

app.post('/guru', (req, res) => {
  const { nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan } = req.body;
  const sql = `
    INSERT INTO guru (nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, jabatan, status_kepegawaian, jenjang, jurusan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, jabatan, status_kepegawaian, jenjang, jurusan], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Guru baru berhasil ditambahkan', id: results.insertId });
  });
});

app.put('/guru/:nip', (req, res) => {
  const { nip } = req.params;
  const { nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan } = req.body;
  const sql = `
    UPDATE guru
    SET nama = ?, nuptk = ?, email = ?, jenis_kelamin = ?, tempat_lahir = ?, tanggal_lahir = ?, alamat = ?, no_telepon = ?, status_kepegawaian = ?, jenjang = ?, jurusan = ?, jabatan = ?
    WHERE nip = ?
  `;
  
  db.query(sql, [nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan, nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Guru dengan NIP tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data guru berhasil diperbarui' });
  });
});

app.delete('/guru/:nip', (req, res) => {
  const { nip } = req.params;
  const sql = `
    DELETE FROM guru WHERE nip = ?
  `;
  
  db.query(sql, [nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Guru dengan NIP tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data guru berhasil dihapus' });
  });
});



app.get('/siswa', (req, res) => {
  const sql = `
  SELECT 
    siswa.*,
    COALESCE(orangtua.namaorangtua, '') AS "nama orangtua",
    COALESCE(orangtua.noteleponorangtua, '') AS "no telepon orangtua",
    CONCAT(kelas.no_kelas, ' ', kelas.nama_kelas) AS kelas,
    kelas.tahun_ajaran AS "tahun ajaran"
FROM 
    siswa
LEFT JOIN 
    (
        SELECT 
            nisn_anak,
            GROUP_CONCAT(Nama SEPARATOR ' dan ') AS namaorangtua,
            GROUP_CONCAT(no_telepon SEPARATOR ' / ') AS noteleponorangtua
        FROM 
            orangtua
        GROUP BY 
            nisn_anak
    ) orangtua ON siswa.nisn = orangtua.nisn_anak
LEFT JOIN
    kelas ON siswa.id_kelas = kelas.id_kelas;
`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post('/siswa', (req, res) => {
  const { nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas } = req.body;
  const sql = `
    INSERT INTO siswa (nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Siswa baru berhasil ditambahkan', id: results.insertId });
  });
});

app.put('/siswa/:nisn', (req, res) => {
  const { nisn } = req.params;
  const { nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas } = req.body;
  const sql = `
    UPDATE siswa
    SET nama = ?, nis = ?, email = ?, jenis_kelamin = ?, tempat_lahir = ?, tanggal_lahir = ?, alamat = ?, no_telepon = ?, id_kelas = ?
    WHERE nisn = ?
  `;
  
  db.query(sql, [nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, nisn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Siswa dengan NISN tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data siswa berhasil diperbarui' });
  });
});

app.delete('/siswa/:nisn', (req, res) => {
  const { nisn } = req.params;
  const sql = `
    DELETE FROM siswa WHERE nisn = ?
  `;
  
  db.query(sql, [nisn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Siswa dengan NISN tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data siswa berhasil dihapus', status: "sukses" });
  });
});



app.get(`/siswa/:nisn`, (req, res) => {
  const { nisn } = req.params;
  const sql = `
    SELECT 
        siswa.*,
        COALESCE(orangtua.namaorangtua, '') AS "nama orangtua",
        COALESCE(orangtua.noteleponorangtua, '') AS "no telepon orangtua",
        CONCAT(kelas.no_kelas, ' ', kelas.nama_kelas) AS kelas,
        kelas.tahun_ajaran AS "tahun ajaran"
    FROM 
        siswa
    LEFT JOIN 
        (
            SELECT 
                nisn_anak,
                GROUP_CONCAT(Nama SEPARATOR ' dan ') AS namaorangtua,
                GROUP_CONCAT(no_telepon SEPARATOR ' / ') AS noteleponorangtua
            FROM 
                orangtua
            GROUP BY 
                nisn_anak
        ) orangtua ON siswa.nisn = orangtua.nisn_anak
    LEFT JOIN
        kelas ON siswa.id_kelas = kelas.id_kelas
    WHERE siswa.nisn = ?; 
  `;
  
  db.query(sql, [parseInt(nisn)], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Menghapus kolom id_kelas dari setiap baris hasil
    results.forEach(result => delete result.id_kelas);
    res.json(results);
  });
});



app.get('/kelas', (req, res) => {
  const sql = `
  SELECT 
      kelas.id_kelas,
      kelas.no_kelas,
      kelas.nama_kelas,
      kelas.nip,
      guru.nama AS walikelas,
      kelas.tahun_ajaran
  FROM 
      kelas
  JOIN 
      guru ON kelas.nip = guru.nip;
`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get('/mata-pelajaran', (req, res) => {
  const sql = `
  SELECT 
      mata_pelajaran.id_matapelajaran,
      mata_pelajaran.nama AS matapelajaran,
      guru.nama AS gurupengampu,
      CONCAT(kelas.no_kelas, ' ', kelas.nama_kelas) AS namakelas
  FROM 
      mata_pelajaran
  JOIN 
      guru ON mata_pelajaran.nip = guru.nip
  JOIN 
      kelas ON mata_pelajaran.id_kelas = kelas.id_kelas
  ORDER BY 
      matapelajaran, gurupengampu;
`;


  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get('/mata-pelajaran/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
        mata_pelajaran.id_matapelajaran,
        mata_pelajaran.nama AS matapelajaran,
        guru.nama AS guru_nama,
        guru.nip AS guru_nip,
        kelas.id_kelas,
        kelas.no_kelas,
        kelas.nama_kelas
    FROM 
        mata_pelajaran
    JOIN 
        guru ON mata_pelajaran.nip = guru.nip
    JOIN 
        kelas ON mata_pelajaran.id_kelas = kelas.id_kelas
    WHERE 
        mata_pelajaran.id_matapelajaran = ?
    ORDER BY 
        matapelajaran, guru_nama;
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Mata pelajaran dengan ID tersebut tidak ditemukan' });
    }

    // Modifikasi hasil query
    const result = results[0];
    const modifiedResult = {
      id_matapelajaran: result.id_matapelajaran,
      matapelajaran: result.matapelajaran,
      guru_pengampu: { label: result.guru_nama, value: result.guru_nip },
      namakelas: result.no_kelas + ' ' + result.nama_kelas,
      namaKelas: {
        value: result.id_kelas,
        label: result.no_kelas + ' ' + result.nama_kelas
      }
    };

    res.json(modifiedResult);
  });
});




app.post('/mata-pelajaran', (req, res) => {
  const { id_matapelajaran, nama, id_kelas, nip } = req.body;
  const sql = `
    INSERT INTO mata_pelajaran (id_matapelajaran, nama, id_kelas, nip)
    VALUES (?, ?, ?, ?)
  `;
  
  db.query(sql, [id_matapelajaran, nama, id_kelas, nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Mata pelajaran baru berhasil ditambahkan', id: results.insertId });
  });
});

app.put('/mata-pelajaran/:id', (req, res) => {
  const { id } = req.params;
  const { nama, id_kelas, nip } = req.body;
  const sql = `
    UPDATE mata_pelajaran
    SET nama = ?, id_kelas = ?, nip = ?
    WHERE id_matapelajaran = ?
  `;
  
  db.query(sql, [nama, id_kelas, nip, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Mata pelajaran dengan ID tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data mata pelajaran berhasil diperbarui' });
  });
});

app.delete('/mata-pelajaran/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    DELETE FROM mata_pelajaran WHERE id_matapelajaran = ?
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Mata pelajaran dengan ID tersebut tidak ditemukan' });
    }
    res.json({ message: 'Data mata pelajaran berhasil dihapus' });
  });
});


// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
