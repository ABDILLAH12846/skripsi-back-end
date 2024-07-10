// app.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
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

app.post('/login', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: 'NISN/NIP dan password wajib diisi' });
  }

  const sqlGuru = `
    SELECT * FROM guru WHERE nip = ? AND password = ?
  `;
  const sqlSiswa = `
    SELECT * FROM siswa WHERE nisn = ? AND password = ?
  `;

  db.query(sqlGuru, [id, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length > 0) {
      const guru = results[0];
      const token = jwt.sign({ id: guru.nip, role: 'guru' }, "secret", { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Gunakan https di lingkungan produksi
        maxAge: 3600000 // 1 jam
      });

      return res.status(200).json({ message: 'Login berhasil', user: guru, role: 'guru' });
    } else {
      db.query(sqlSiswa, [id, password], (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
          const siswa = results[0];
          const token = jwt.sign({ id: siswa.nisn, role: 'siswa' }, "secret", { expiresIn: '1h' });

          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Gunakan https di lingkungan produksi
            maxAge: 3600000 // 1 jam
          });

          return res.status(200).json({ message: 'Login berhasil', user: siswa, role: 'siswa' });
        } else {
          return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }
      });
    }
  });
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
  const { nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan, password } = req.body;
  const sql = `
    INSERT INTO guru (nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, jabatan, status_kepegawaian, jenjang, jurusan, password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [nip, nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, jabatan, status_kepegawaian, jenjang, jurusan, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Guru baru berhasil ditambahkan', id: results.insertId });
  });
});


app.put('/guru/:nip', (req, res) => {
  const { nip } = req.params;
  const { nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan, password } = req.body;
  const sql = `
    UPDATE guru
    SET nama = ?, nuptk = ?, email = ?, jenis_kelamin = ?, tempat_lahir = ?, tanggal_lahir = ?, alamat = ?, no_telepon = ?, status_kepegawaian = ?, jenjang = ?, jurusan = ?, jabatan = ?, password = ?
    WHERE nip = ?
  `;
  
  db.query(sql, [nama, nuptk, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, status_kepegawaian, jenjang, jurusan, jabatan, password, nip], (err, results) => {
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
    CONCAT(
      COALESCE(wali.nama, ''), 
      IF(wali.nama IS NOT NULL, ', ', ''), 
      COALESCE(ayah.nama, ''), 
      IF(ayah.nama IS NOT NULL, ', ', ''), 
      COALESCE(ibu.nama, '')
    ) AS nama_orangtua,
    CONCAT(
      COALESCE(wali.no_telepon, ''), 
      IF(wali.no_telepon IS NOT NULL, ', ', ''), 
      COALESCE(ayah.no_telepon, ''), 
      IF(ayah.no_telepon IS NOT NULL, ', ', ''), 
      COALESCE(ibu.no_telepon, '')
    ) AS no_telepon_orangtua,
    CONCAT(kelas.no_kelas, ' ', kelas.nama_kelas) AS kelas,
    kelas.tahun_ajaran AS tahun_ajaran
  FROM 
    siswa
  LEFT JOIN 
    orangtua AS wali ON siswa.id_wali = wali.id_orangtua
  LEFT JOIN 
    orangtua AS ayah ON siswa.id_ayah = ayah.id_orangtua
  LEFT JOIN 
    orangtua AS ibu ON siswa.id_ibu = ibu.id_orangtua
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
  const { nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, password } = req.body;
  const sql = `
    INSERT INTO siswa (nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [nisn, nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Siswa baru berhasil ditambahkan', id: results.insertId });
  });
});


app.put('/siswa/:nisn', (req, res) => {
  const { nisn } = req.params;
  const { nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, password } = req.body;
  const sql = `
    UPDATE siswa
    SET nama = ?, nis = ?, email = ?, jenis_kelamin = ?, tempat_lahir = ?, tanggal_lahir = ?, alamat = ?, no_telepon = ?, id_kelas = ?, password = ?
    WHERE nisn = ?
  `;
  
  db.query(sql, [nama, nis, email, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telepon, id_kelas, password, nisn], (err, results) => {
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



app.get('/siswa/:nisn', (req, res) => {
  const { nisn } = req.params;
  const sql = `
    SELECT 
        siswa.nisn,
        siswa.nama,
        siswa.nis,
        siswa.email,
        siswa.jenis_kelamin,
        siswa.tempat_lahir,
        siswa.tanggal_lahir,
        siswa.alamat,
        siswa.no_telepon,
        siswa.password,
        CONCAT(
          COALESCE(wali.nama, ''), 
          IF(wali.nama IS NOT NULL, ', ', ''), 
          COALESCE(ayah.nama, ''), 
          IF(ayah.nama IS NOT NULL, ', ', ''), 
          COALESCE(ibu.nama, '')
        ) AS nama_orangtua,
        CONCAT(
          COALESCE(wali.no_telepon, ''), 
          IF(wali.no_telepon IS NOT NULL, ', ', ''), 
          COALESCE(ayah.no_telepon, ''), 
          IF(ayah.no_telepon IS NOT NULL, ', ', ''), 
          COALESCE(ibu.no_telepon, '')
        ) AS no_telepon_orangtua,
        CONCAT(kelas.no_kelas, ' ', kelas.nama_kelas) AS kelas,
        kelas.tahun_ajaran AS tahun_ajaran
    FROM 
        siswa
    LEFT JOIN 
        orangtua AS wali ON siswa.id_wali = wali.id_orangtua
    LEFT JOIN 
        orangtua AS ayah ON siswa.id_ayah = ayah.id_orangtua
    LEFT JOIN 
        orangtua AS ibu ON siswa.id_ibu = ibu.id_orangtua
    LEFT JOIN
        kelas ON siswa.id_kelas = kelas.id_kelas
    WHERE siswa.nisn = ?;
  `;
  
  db.query(sql, [parseInt(nisn)], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});


app.put('/siswa', (req, res) => {
  const { id_kelas, nisn_list } = req.body;

  console.log("kelas")

  // Validasi data input
  if (!id_kelas || !Array.isArray(nisn_list) || nisn_list.length === 0) {
    return res.status(400).json({ error: 'id_kelas dan nisn_list yang valid wajib diisi' });
  }

  // SQL query untuk update data siswa
  const sql = `
    UPDATE siswa
    SET id_kelas = ?
    WHERE nisn = ?
  `;

  // SQL query untuk set id_kelas ke NULL
  const sqlSetNull = `
    UPDATE siswa
    SET id_kelas = NULL
    WHERE nisn = ?
  `;

  // Menjalankan update query untuk setiap nisn
  const queries = nisn_list.map(nisn => {
    console.log(nisn)
    return new Promise((resolve, reject) => {
      if (!nisn.kelas) {
        // Set id_kelas ke NULL jika nisn adalah "null"
        db.query(sqlSetNull, [nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      } else {
        // Update id_kelas dengan nilai yang diberikan jika nisn tidak "null"
        db.query(sql, [id_kelas, nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    });
  });

  // Menunggu semua query selesai
  Promise.all(queries)
    .then(() => {
      res.status(200).json({ message: 'Data siswa berhasil diperbarui' });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

app.put('/walisiswa', (req, res) => {
  const { id_orangtua, nisn_list } = req.body;

  console.log("hallo")

  // Validasi data input
  if (!id_orangtua || !Array.isArray(nisn_list) || nisn_list.length === 0) {
    return res.status(400).json({ error: 'id_orangtua dan nisn_list yang valid wajib diisi' });
  }

  // SQL query untuk update data siswa
  const sql = `
    UPDATE siswa
    SET id_wali = ?
    WHERE nisn = ?
  `;

  // SQL query untuk set id_orangtua ke NULL
  const sqlSetNull = `
    UPDATE siswa
    SET id_wali = NULL
    WHERE nisn = ?
  `;

  // Menjalankan update query untuk setiap nisn
  const queries = nisn_list.map(nisn => {
    return new Promise((resolve, reject) => {
      if (!nisn.kelas) {
        // Set id_orangtua ke NULL jika id_orangtua adalah "null"
        console.log("b aja")
        db.query(sqlSetNull, [nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      } else {
        // Update id_orangtua dengan nilai yang diberikan jika id_orangtua tidak "null"
        
        db.query(sql, [id_orangtua, nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    });
  });

  // Menunggu semua query selesai
  Promise.all(queries)
    .then(() => {
      res.status(200).json({ message: 'Data siswa berhasil diperbarui' });
    })
    .catch(err => {
      res.status(500).json("hallo");
    });
});

app.put('/ayahsiswa', (req, res) => {
  const { id_orangtua, nisn_list } = req.body;

  console.log("hallo")

  // Validasi data input
  if (!id_orangtua || !Array.isArray(nisn_list) || nisn_list.length === 0) {
    return res.status(400).json({ error: 'id_orangtua dan nisn_list yang valid wajib diisi' });
  }

  // SQL query untuk update data siswa
  const sql = `
    UPDATE siswa
    SET id_ayah = ?
    WHERE nisn = ?
  `;

  // SQL query untuk set id_orangtua ke NULL
  const sqlSetNull = `
    UPDATE siswa
    SET id_ayah = NULL
    WHERE nisn = ?
  `;

  // Menjalankan update query untuk setiap nisn
  const queries = nisn_list.map(nisn => {
    return new Promise((resolve, reject) => {
      if (!nisn.kelas) {
        // Set id_orangtua ke NULL jika id_orangtua adalah "null"
        console.log("b aja")
        db.query(sqlSetNull, [nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      } else {
        // Update id_orangtua dengan nilai yang diberikan jika id_orangtua tidak "null"
        
        db.query(sql, [id_orangtua, nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    });
  });

  // Menunggu semua query selesai
  Promise.all(queries)
    .then(() => {
      res.status(200).json({ message: 'Data siswa berhasil diperbarui' });
    })
    .catch(err => {
      res.status(500).json("hallo");
    });
});

app.put('/ibusiswa', (req, res) => {
  const { id_orangtua, nisn_list } = req.body;

  console.log("hallo")

  // Validasi data input
  if (!id_orangtua || !Array.isArray(nisn_list) || nisn_list.length === 0) {
    return res.status(400).json({ error: 'id_orangtua dan nisn_list yang valid wajib diisi' });
  }

  // SQL query untuk update data siswa
  const sql = `
    UPDATE siswa
    SET id_ibu = ?
    WHERE nisn = ?
  `;

  // SQL query untuk set id_orangtua ke NULL
  const sqlSetNull = `
    UPDATE siswa
    SET id_ibu = NULL
    WHERE nisn = ?
  `;

  // Menjalankan update query untuk setiap nisn
  const queries = nisn_list.map(nisn => {
    return new Promise((resolve, reject) => {
      if (!nisn.kelas) {
        // Set id_orangtua ke NULL jika id_orangtua adalah "null"
        console.log("b aja")
        db.query(sqlSetNull, [nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      } else {
        // Update id_orangtua dengan nilai yang diberikan jika id_orangtua tidak "null"
        
        db.query(sql, [id_orangtua, nisn.nisn], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    });
  });

  // Menunggu semua query selesai
  Promise.all(queries)
    .then(() => {
      res.status(200).json({ message: 'Data siswa berhasil diperbarui' });
    })
    .catch(err => {
      res.status(500).json("hallo");
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

app.get('/kelas/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      kelas.id_kelas,
      kelas.no_kelas,
      kelas.nama_kelas,
      kelas.nip,
      guru.nama AS walikelas,
      kelas.tahun_ajaran,
      siswa.nisn,
      siswa.nama AS nama_siswa
    FROM 
      kelas
    LEFT JOIN 
      guru ON kelas.nip = guru.nip
    LEFT JOIN 
      siswa ON kelas.id_kelas = siswa.id_kelas
    WHERE
      kelas.id_kelas = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Kelas dengan ID tersebut tidak ditemukan' });
    }

    // Proses hasil query
    const kelasInfo = {
      id_kelas: results[0].id_kelas,
      no_kelas: results[0].no_kelas,
      nama_kelas: results[0].nama_kelas,
      nip: results[0].nip,
      walikelas: results[0].walikelas,
      tahun_ajaran: results[0].tahun_ajaran,
      daftar_siswa: []
    };

    // Mengisi daftar_siswa dengan data siswa
    results.forEach(row => {
      if (row.nisn) {
        kelasInfo.daftar_siswa.push({
          nisn: row.nisn,
          nama: row.nama_siswa
        });
      }
    });

    res.json(kelasInfo);
  });
});

app.post('/kelas', (req, res) => {
  const { id_kelas, no_kelas, nama_kelas, nip, tahun_ajaran } = req.body;

  // Validasi data input
  if (!id_kelas || !no_kelas || !nama_kelas || !nip || !tahun_ajaran) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  // SQL query untuk mengecek apakah nama kelas dan NIP sudah ada
  const checkSql = `
    SELECT COUNT(*) AS count
    FROM kelas
    WHERE nama_kelas = ? AND nip = ?
  `;

  db.query(checkSql, [nama_kelas, nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ error: 'Nama kelas dan NIP sudah ada di data sebelumnya' });
    }

    // SQL query untuk insert data ke tabel kelas
    const insertSql = `
      INSERT INTO kelas (id_kelas, no_kelas, nama_kelas, nip, tahun_ajaran)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [id_kelas, no_kelas, nama_kelas, nip, tahun_ajaran], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Data kelas berhasil ditambahkan', id: results.insertId });
    });
  });
});

app.put('/kelas/:id_kelas', (req, res) => {
  const { id_kelas } = req.params;
  const { no_kelas, nama_kelas, nip, tahun_ajaran } = req.body;

  // Validasi data input
  if (!no_kelas || !nama_kelas || !nip || !tahun_ajaran) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  // SQL query untuk memperbarui data kelas
  const updateSql = `
    UPDATE kelas
    SET no_kelas = ?, nama_kelas = ?, nip = ?, tahun_ajaran = ?
    WHERE id_kelas = ?
  `;

  db.query(updateSql, [no_kelas, nama_kelas, nip, tahun_ajaran, id_kelas], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Data kelas tidak ditemukan' });
    }
    
    res.status(200).json({ message: 'Data kelas berhasil diperbarui' });
  });
});

app.put('/kelas/:id_kelas/no_tahun', (req, res) => {
  const { id_kelas } = req.params;
  const { no_kelas, tahun_ajaran } = req.body;

  // Validasi data input
  if (!no_kelas || !tahun_ajaran) {
    return res.status(400).json({ error: 'Kolom nomor kelas dan tahun ajaran wajib diisi' });
  }

  // SQL query untuk memperbarui nomor kelas dan tahun ajaran
  const updateSql = `
    UPDATE kelas
    SET no_kelas = ?, tahun_ajaran = ?
    WHERE id_kelas = ?
  `;

  db.query(updateSql, [no_kelas, tahun_ajaran, id_kelas], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Data kelas tidak ditemukan' });
    }
    
    res.status(200).json({ message: 'Nomor kelas dan tahun ajaran berhasil diperbarui' });
  });
});


app.delete('/kelas/:id_kelas', (req, res) => {
  const { id_kelas } = req.params;

  // SQL query untuk menghapus data kelas
  const deleteSql = `
    DELETE FROM kelas
    WHERE id_kelas = ?
  `;

  db.query(deleteSql, [id_kelas], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Data kelas tidak ditemukan' });
    }
    
    res.status(200).json({ message: 'Data kelas berhasil dihapus' });
  });
});

app.get('/kelasanyar/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      kelas.id_kelas,
      kelas.no_kelas,
      kelas.nama_kelas,
      kelas.nip,
      guru.nama AS walikelas,
      kelas.tahun_ajaran,
      siswa.nisn,
      siswa.nama AS nama_siswa,
      mata_pelajaran.id_matapelajaran,
      mata_pelajaran.nama AS nama_matapelajaran,
      COALESCE(uts.nilai, 0) AS nilai_uts,
      COALESCE(uas.nilai, 0) AS nilai_uas,
      COALESCE(uha.nilai, 0) AS nilai_uha,
      COALESCE(th.nilai, 0) AS nilai_th
    FROM 
      kelas
    LEFT JOIN 
      guru ON kelas.nip = guru.nip
    LEFT JOIN 
      siswa ON kelas.id_kelas = siswa.id_kelas
    LEFT JOIN 
      mata_pelajaran ON kelas.id_kelas = mata_pelajaran.id_kelas
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UTS' AND semester = 'genap' AND tahun_ajaran = ?) AS uts ON siswa.nisn = uts.nisn AND mata_pelajaran.id_matapelajaran = uts.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UAS' AND semester = 'genap' AND tahun_ajaran = ?) AS uas ON siswa.nisn = uas.nisn AND mata_pelajaran.id_matapelajaran = uas.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UHA' AND semester = 'genap' AND tahun_ajaran = ?) AS uha ON siswa.nisn = uha.nisn AND mata_pelajaran.id_matapelajaran = uha.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'TH' AND semester = 'genap' AND tahun_ajaran = ?) AS th ON siswa.nisn = th.nisn AND mata_pelajaran.id_matapelajaran = th.id_matapelajaran
    WHERE
      kelas.id_kelas = ?
  `;

  const tahun_ajaran = '2023/2024'; // Sesuaikan dengan tahun ajaran yang diinginkan

  db.query(sql, [tahun_ajaran, tahun_ajaran, tahun_ajaran, tahun_ajaran, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Kelas dengan ID tersebut tidak ditemukan' });
    }

    // Proses hasil query
    const kelasInfo = {
      id_kelas: results[0].id_kelas,
      no_kelas: results[0].no_kelas,
      nama_kelas: results[0].nama_kelas,
      nip: results[0].nip,
      walikelas: results[0].walikelas,
      tahun_ajaran: results[0].tahun_ajaran,
      mata_pelajaran: [],
      daftar_siswa: []
    };

    // Mengisi mata_pelajaran dengan data mata pelajaran
    const mataPelajaranSet = new Set();
    results.forEach(row => {
      if (row.id_matapelajaran && row.nama_matapelajaran) {
        if (!mataPelajaranSet.has(row.id_matapelajaran)) {
          mataPelajaranSet.add(row.id_matapelajaran);
          kelasInfo.mata_pelajaran.push({
            id_matapelajaran: row.id_matapelajaran,
            nama_matapelajaran: row.nama_matapelajaran,
          });
        }
      }
    });

    // Mengisi daftar_siswa dengan data siswa
    results.forEach(row => {
      const existingSiswa = kelasInfo.daftar_siswa.find(s => s.nisn === row.nisn);
      if (!existingSiswa) {
        kelasInfo.daftar_siswa.push({
          nisn: row.nisn,
          nama: row.nama_siswa,
          nilai_total: 0 // Menambahkan nilai_total untuk menyimpan hasil akhir
        });
      }
    });

    // Mengisi nilai_total siswa berdasarkan mata pelajaran
    results.forEach(row => {
      const siswa = kelasInfo.daftar_siswa.find(s => s.nisn === row.nisn);
      if (siswa) {
        const nilai_uts = row.nilai_uts * 0.3;
        const nilai_uas = row.nilai_uas * 0.3;
        const nilai_uha_th = (row.nilai_uha + row.nilai_th) * 0.4;
        siswa.nilai_total += nilai_uts + nilai_uas + nilai_uha_th;
      }
    });

    // Membagi nilai_total dengan jumlah mata pelajaran
    const jumlahMataPelajaran = kelasInfo.mata_pelajaran.length;
    if (jumlahMataPelajaran > 0) {
      kelasInfo.daftar_siswa.forEach(siswa => {
        siswa.nilai_total /= jumlahMataPelajaran;
      });
    }

    res.json(kelasInfo);
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

app.get('/absensi/:nip', (req, res) => {
  const { nip } = req.params;

  const sql = `
    SELECT 
        siswa.nama AS nama,
        siswa.nisn AS nisn,
        COALESCE(SUM(CASE WHEN absensi.status = 'sakit' THEN 1 ELSE 0 END), 0) AS sakit,
        COALESCE(SUM(CASE WHEN absensi.status = 'absen' THEN 1 ELSE 0 END), 0) AS absen,
        COALESCE(SUM(CASE WHEN absensi.status = 'hadir' THEN 1 ELSE 0 END), 0) AS hadir
    FROM 
        kelas
    JOIN 
        siswa ON kelas.id_kelas = siswa.id_kelas
    LEFT JOIN 
        absensi ON siswa.nisn = absensi.nisn
    WHERE 
        kelas.nip = ?
    GROUP BY 
        siswa.nisn, siswa.nama;
  `;

  db.query(sql, [nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Format hasil query ke dalam struktur yang diinginkan
    const formattedResults = results.map(result => ({
      nama: result.nama,
      nisn: result.nisn,
      absensi: {
        sakit: result.sakit,
        absen: result.absen,
        hadir: result.hadir
      }
    }));

    res.json(formattedResults);
  });
});

app.get('/absensi/:nip/:tanggal', (req, res) => {
  const { nip, tanggal } = req.params;

  const sql = `
    SELECT 
        absensi.id_absensi,
        siswa.nisn,
        siswa.nama,
        COALESCE(absensi.tanggal, ?) AS tanggal,
        COALESCE(absensi.status, 'hadir') AS status
    FROM 
        siswa
    JOIN 
        kelas ON siswa.id_kelas = kelas.id_kelas
    LEFT JOIN 
        absensi ON siswa.nisn = absensi.nisn AND absensi.tanggal = ?
    WHERE 
        kelas.nip = ?;
  `;

  db.query(sql, [tanggal, tanggal, nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});

app.post('/absensi', (req, res) => {
  const { attendanceData } = req.body;

  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty attendance data array' });
  }

  const values = attendanceData.map(item => [
    item.id_absensi,
    item.tanggal,
    item.status,
    item.deskripsi,
    item.nisn
  ]);

  const sql = `
    INSERT INTO absensi (id_absensi, tanggal, status, deskripsi, nisn)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error('Error executing SQL query: ', err);
      return res.status(500).json({ error: 'Failed to add multiple attendance records' });
    }

    res.status(201).json({ message: 'Multiple attendance records added successfully' });
  });
});

// PUT Endpoint to update multiple attendance records (Optimized approach)
app.put('/absensi', (req, res) => {
  const { attendanceData } = req.body;

  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty attendance data array' });
  }

  const sql = `
    UPDATE absensi
    SET tanggal = ?,
        status = ?,
        deskripsi = ?,
        nisn = ?
    WHERE id_absensi = ?
  `;

  // Prepare an array of promises for each update operation
  const promises = attendanceData.map(item => {
    const { id_absensi, tanggal, status, deskripsi, nisn } = item;
    const values = [tanggal, status, deskripsi, nisn, id_absensi];

    return new Promise((resolve, reject) => {
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Error executing SQL query: ', err);
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });

  // Execute all promises in parallel
  Promise.all(promises)
    .then(results => {
      const affectedRows = results.reduce((total, result) => total + result.affectedRows, 0);
      res.json({ message: `${affectedRows} attendance records updated successfully` });
    })
    .catch(err => {
      console.error('Error updating attendance records:', err);
      res.status(500).json({ error: 'Failed to update attendance records' });
    });
});

app.get('/data', (req, res) => {
  const sql = `
  SELECT
      guru.nip,
      guru.nama AS nama_guru,
      kelas.id_kelas,
      kelas.nama_kelas,
      JSON_ARRAYAGG(
          JSON_OBJECT(
              'id_matapelajaran', mata_pelajaran.id_matapelajaran,
              'nama', mata_pelajaran.nama
          )
      ) AS mata_pelajaran
  FROM
      guru
  JOIN
      kelas ON guru.nip = kelas.nip
  JOIN
      mata_pelajaran ON kelas.id_kelas = mata_pelajaran.id_kelas
  GROUP BY
      guru.nip, guru.nama, kelas.id_kelas, kelas.nama_kelas;
`;

db.query(sql, (err, results) => {
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  res.json(results);
});
});

app.get('/filter-nilai', (req, res) => {
  const sql = `
    SELECT 
        guru.nip,
        guru.nama AS nama_guru,
        kelas.id_kelas AS kelas,
        mata_pelajaran.id_matapelajaran,
        mata_pelajaran.nama AS nama_matapelajaran
    FROM 
        guru
    JOIN 
        mata_pelajaran ON guru.nip = mata_pelajaran.nip
    JOIN 
        kelas ON mata_pelajaran.id_kelas = kelas.id_kelas
    ORDER BY 
        guru.nip, kelas.id_kelas;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Process the results to group by 'nip' and 'kelas'
    const groupedResults = results.reduce((acc, curr) => {
      const { nip, nama_guru, kelas, id_matapelajaran, nama_matapelajaran } = curr;

      // Find existing entry for the current guru
      let guruEntry = acc.find(entry => entry.nip === nip);

      if (!guruEntry) {
        // If the entry doesn't exist, create a new one
        guruEntry = {
          nip,
          nama_guru,
          daftarmatapelajaran: []
        };
        acc.push(guruEntry);
      }

      // Find existing entry for the current class
      let kelasEntry = guruEntry.daftarmatapelajaran.find(entry => entry.kelas === kelas);

      if (!kelasEntry) {
        // If the entry doesn't exist, create a new one
        kelasEntry = {
          kelas,
          matapelajaran: []
        };
        guruEntry.daftarmatapelajaran.push(kelasEntry);
      }

      // Add the current subject to the class's subject list
      kelasEntry.matapelajaran.push({
        id: id_matapelajaran,
        nama: nama_matapelajaran
      });

      return acc;
    }, []);

    res.json(groupedResults);
  });
});

app.get('/filter-nilai/:nip', (req, res) => {
  const { nip } = req.params;

  const sql = `
    SELECT 
        guru.nip,
        guru.nama AS nama_guru,
        kelas.id_kelas AS kelas,
        kelas.nama_kelas,
        kelas.no_kelas,
        mata_pelajaran.id_matapelajaran,
        mata_pelajaran.nama AS nama_matapelajaran
    FROM 
        guru
    JOIN 
        mata_pelajaran ON guru.nip = mata_pelajaran.nip
    JOIN 
        kelas ON mata_pelajaran.id_kelas = kelas.id_kelas
    WHERE 
        guru.nip = ?
    ORDER BY 
        kelas.id_kelas;
  `;

  db.query(sql, [nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Process the results to group by 'nip' and 'kelas'
    const groupedResults = results.reduce((acc, curr) => {
      const { nip, nama_guru, kelas, nama_kelas, no_kelas, id_matapelajaran, nama_matapelajaran } = curr;

      // Find existing entry for the current guru
      let guruEntry = acc.find(entry => entry.nip === nip);

      if (!guruEntry) {
        // If the entry doesn't exist, create a new one
        guruEntry = {
          nip,
          nama_guru,
          daftarmatapelajaran: []
        };
        acc.push(guruEntry);
      }

      // Find existing entry for the current class
      let kelasEntry = guruEntry.daftarmatapelajaran.find(entry => entry.kelas === kelas);

      if (!kelasEntry) {
        // If the entry doesn't exist, create a new one
        kelasEntry = {
          kelas,
          nama_kelas,
          no_kelas,
          matapelajaran: []
        };
        guruEntry.daftarmatapelajaran.push(kelasEntry);
      }

      // Add the current subject to the class's subject list
      kelasEntry.matapelajaran.push({
        id: id_matapelajaran,
        nama: nama_matapelajaran
      });

      return acc;
    }, []);

    res.json(groupedResults);
  });
});


app.get('/nilai', (req, res) => {
  const sql = `
    SELECT 
      nilai.*, 
      siswa.nama AS nama_siswa, 
      mata_pelajaran.nama AS nama_matapelajaran 
    FROM 
      nilai
    JOIN 
      siswa ON nilai.nisn = siswa.nisn
    JOIN 
      mata_pelajaran ON nilai.id_matapelajaran = mata_pelajaran.id_matapelajaran
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});


app.get('/nilai/:nisn', (req, res) => {
  const { nisn } = req.params;

  const sql = `
    SELECT 
      nilai.*, 
      siswa.nama AS nama_siswa, 
      mata_pelajaran.nama AS nama_matapelajaran 
    FROM 
      nilai
    JOIN 
      siswa ON nilai.nisn = siswa.nisn
    JOIN 
      mata_pelajaran ON nilai.id_matapelajaran = mata_pelajaran.id_matapelajaran
    WHERE 
      nilai.nisn = ?
  `;

  db.query(sql, [nisn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get('/nilai/mapel/:id_matapelajaran', (req, res) => {
  const { id_matapelajaran } = req.params;
  console.log(`Mencari nilai untuk id_matapelajaran: ${id_matapelajaran}`);

  const sql = `
    SELECT 
      nilai.*, 
      siswa.nama AS nama_siswa, 
      mata_pelajaran.nama AS nama_matapelajaran 
    FROM 
      nilai
    JOIN 
      siswa ON nilai.nisn = siswa.nisn
    JOIN 
      mata_pelajaran ON nilai.id_matapelajaran = mata_pelajaran.id_matapelajaran
    WHERE 
      nilai.id_matapelajaran = ?
  `;

  db.query(sql, [id_matapelajaran], (err, results) => {
    if (err) {
      console.error(`Error saat menjalankan query: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.log(`Tidak ada data ditemukan untuk id_matapelajaran: ${id_matapelajaran}`);
      return res.status(404).json({ message: 'Tidak ada data nilai ditemukan' });
    }
    res.json(results);
  });
});

app.get('/nilai/matapelajaran/:id_matapelajaran', (req, res) => {
  const { id_matapelajaran } = req.params;
  const { semester } = req.query;

  // Validasi data input
  if (!semester) {
    return res.status(400).json({ error: 'Semester wajib diisi' });
  }

  const sql = `
    SELECT 
      siswa.nisn,
      siswa.nama AS nama_siswa,
      kelas.no_kelas,
      kelas.nama_kelas,
      mata_pelajaran.id_matapelajaran,
      mata_pelajaran.nama AS nama_matapelajaran,
      COALESCE(uts.nilai, 0) AS uts_nilai,
      COALESCE(uas.nilai, 0) AS uas_nilai,
      COALESCE(uha.nilai, 0) AS uha_nilai,
      COALESCE(th.nilai, 0) AS th_nilai
    FROM 
      siswa
    JOIN 
      kelas ON siswa.id_kelas = kelas.id_kelas
    JOIN 
      mata_pelajaran ON kelas.id_kelas = mata_pelajaran.id_kelas
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UTS' AND semester = ?) AS uts ON siswa.nisn = uts.nisn AND mata_pelajaran.id_matapelajaran = uts.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UAS' AND semester = ?) AS uas ON siswa.nisn = uas.nisn AND mata_pelajaran.id_matapelajaran = uas.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UHA' AND semester = ?) AS uha ON siswa.nisn = uha.nisn AND mata_pelajaran.id_matapelajaran = uha.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'TH' AND semester = ?) AS th ON siswa.nisn = th.nisn AND mata_pelajaran.id_matapelajaran = th.id_matapelajaran
    WHERE 
      mata_pelajaran.id_matapelajaran = ?;
  `;

  db.query(sql, [semester, semester, semester, semester, id_matapelajaran], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formattedResults = results.map(result => ({
      nisn: result.nisn,
      nama_siswa: result.nama_siswa,
      no_kelas: result.no_kelas,
      nama_kelas: result.nama_kelas,
      id_matapelajaran: result.id_matapelajaran,
      nama_matapelajaran: result.nama_matapelajaran,
      nilai_seluruh: [
        { tipe: 'UTS', nilai: result.uts_nilai },
        { tipe: 'UAS', nilai: result.uas_nilai },
        { tipe: 'UHA', nilai: result.uha_nilai },
        { tipe: 'TH', nilai: result.th_nilai }
      ]
    }));

    res.json(formattedResults);
  });
});


app.get('/nilai/matapelajaran/:id_matapelajaran/:nisn/:semester', (req, res) => {
  const { id_matapelajaran, nisn, semester } = req.params;

  const sql = `
    SELECT 
      siswa.nisn,
      siswa.nama AS nama_siswa,
      kelas.no_kelas,
      kelas.nama_kelas,
      kelas.tahun_ajaran,
      mata_pelajaran.id_matapelajaran,
      mata_pelajaran.nama AS nama_matapelajaran,
      COALESCE(uts.id_nilai, NULL) AS uts_id_nilai,
      COALESCE(uts.nilai, 0) AS uts_nilai,
      COALESCE(uas.id_nilai, NULL) AS uas_id_nilai,
      COALESCE(uas.nilai, 0) AS uas_nilai,
      COALESCE(uha.id_nilai, NULL) AS uha_id_nilai,
      COALESCE(uha.nilai, 0) AS uha_nilai,
      COALESCE(th.id_nilai, NULL) AS th_id_nilai,
      COALESCE(th.nilai, 0) AS th_nilai
    FROM 
      siswa
    JOIN 
      kelas ON siswa.id_kelas = kelas.id_kelas
    JOIN 
      mata_pelajaran ON kelas.id_kelas = mata_pelajaran.id_kelas
    LEFT JOIN 
      (SELECT id_nilai, nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UTS' AND semester = ?) AS uts ON siswa.nisn = uts.nisn AND mata_pelajaran.id_matapelajaran = uts.id_matapelajaran
    LEFT JOIN 
      (SELECT id_nilai, nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UAS' AND semester = ?) AS uas ON siswa.nisn = uas.nisn AND mata_pelajaran.id_matapelajaran = uas.id_matapelajaran
    LEFT JOIN 
      (SELECT id_nilai, nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UHA' AND semester = ?) AS uha ON siswa.nisn = uha.nisn AND mata_pelajaran.id_matapelajaran = uha.id_matapelajaran
    LEFT JOIN 
      (SELECT id_nilai, nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'TH' AND semester = ?) AS th ON siswa.nisn = th.nisn AND mata_pelajaran.id_matapelajaran = th.id_matapelajaran
    WHERE 
      mata_pelajaran.id_matapelajaran = ? AND siswa.nisn = ?;
  `;

  db.query(sql, [semester, semester, semester, semester, id_matapelajaran, nisn], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formattedResults = results.map(result => ({
      nisn: result.nisn,
      nama_siswa: result.nama_siswa,
      no_kelas: result.no_kelas,
      nama_kelas: result.nama_kelas,
      tahun_ajaran: result.tahun_ajaran,
      id_matapelajaran: result.id_matapelajaran,
      nama_matapelajaran: result.nama_matapelajaran,
      nilai_seluruh: [
        { tipe: 'UTS', id_nilai: result.uts_id_nilai, nilai: result.uts_nilai },
        { tipe: 'UAS', id_nilai: result.uas_id_nilai, nilai: result.uas_nilai },
        { tipe: 'UHA', id_nilai: result.uha_id_nilai, nilai: result.uha_nilai },
        { tipe: 'TH', id_nilai: result.th_id_nilai, nilai: result.th_nilai }
      ]
    }));

    res.json(formattedResults);
  });
});


app.get('/nilai/matapelajaran/semester/genap', (req, res) => {
  const { tahun_ajaran, id_kelas } = req.query;

  const sql = `
    SELECT 
      siswa.nisn,
      siswa.nama AS nama_siswa,
      kelas.no_kelas,
      kelas.nama_kelas,
      mata_pelajaran.id_matapelajaran,
      mata_pelajaran.nama AS nama_matapelajaran,
      COALESCE(uts.nilai, 0) AS uts_nilai,
      COALESCE(uas.nilai, 0) AS uas_nilai,
      COALESCE(uha.nilai, 0) AS uha_nilai,
      COALESCE(th.nilai, 0) AS th_nilai
    FROM 
      siswa
    JOIN 
      kelas ON siswa.id_kelas = kelas.id_kelas
    JOIN 
      mata_pelajaran ON kelas.id_kelas = mata_pelajaran.id_kelas
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UTS' AND semester = 'genap' AND tahun_ajaran = ?) AS uts ON siswa.nisn = uts.nisn AND mata_pelajaran.id_matapelajaran = uts.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UAS' AND semester = 'genap' AND tahun_ajaran = ?) AS uas ON siswa.nisn = uas.nisn AND mata_pelajaran.id_matapelajaran = uas.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'UHA' AND semester = 'genap' AND tahun_ajaran = ?) AS uha ON siswa.nisn = uha.nisn AND mata_pelajaran.id_matapelajaran = uha.id_matapelajaran
    LEFT JOIN 
      (SELECT nisn, id_matapelajaran, nilai FROM nilai WHERE tipe = 'TH' AND semester = 'genap' AND tahun_ajaran = ?) AS th ON siswa.nisn = th.nisn AND mata_pelajaran.id_matapelajaran = th.id_matapelajaran
    WHERE 
      kelas.id_kelas = ? AND mata_pelajaran.id_matapelajaran IS NOT NULL;
  `;

  db.query(sql, [tahun_ajaran, tahun_ajaran, tahun_ajaran, tahun_ajaran, id_kelas], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formattedResults = results.map(result => ({
      nisn: result.nisn,
      nama_siswa: result.nama_siswa,
      no_kelas: result.no_kelas,
      nama_kelas: result.nama_kelas,
      id_matapelajaran: result.id_matapelajaran,
      nama_matapelajaran: result.nama_matapelajaran,
      nilai_seluruh: [
        { tipe: 'UTS', nilai: result.uts_nilai },
        { tipe: 'UAS', nilai: result.uas_nilai },
        { tipe: 'UHA', nilai: result.uha_nilai },
        { tipe: 'TH', nilai: result.th_nilai }
      ]
    }));

    res.json(formattedResults);
  });
});




app.post('/nilai', (req, res) => {
  const { id_nilai, nisn, id_matapelajaran, tipe, nilai, semester, tahun_ajaran } = req.body;

  // Validasi data input
  if (!id_nilai || !nisn || !id_matapelajaran || !tipe || !nilai || !semester || !tahun_ajaran) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  const sql = `
    INSERT INTO nilai (id_nilai, nisn, id_matapelajaran, tipe, nilai, semester, tahun_ajaran)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [id_nilai, nisn, id_matapelajaran, tipe, nilai, semester, tahun_ajaran], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Nilai berhasil ditambahkan', id: result.insertId });
  });
});


app.put('/nilai/:id_nilai', (req, res) => {
  const { id_nilai } = req.params;
  const { nisn, id_matapelajaran, tipe, nilai, semester, tahun_ajaran } = req.body;

  // Validasi data input
  if (!nisn || !id_matapelajaran || !tipe || !nilai || !semester || !tahun_ajaran) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  const sql = `
    UPDATE nilai 
    SET nisn = ?, id_matapelajaran = ?, tipe = ?, nilai = ?, semester = ?, tahun_ajaran = ?
    WHERE id_nilai = ?
  `;

  db.query(sql, [nisn, id_matapelajaran, tipe, nilai, semester, tahun_ajaran, id_nilai], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Nilai tidak ditemukan' });
    }
    res.json({ message: 'Nilai berhasil diperbarui' });
  });
});

app.get('/hafalan/:nip', (req, res) => {
  const { nip } = req.params;
  let { bulan } = req.query;

  // Jika bulan tidak ada di query, gunakan bulan saat ini
  const currentMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;

  const sql = `
    SELECT 
      kelas.id_kelas,
      kelas.nama_kelas,
      siswa.nisn,
      siswa.nama AS nama_siswa,
      hafalan.bulan,
      hafalan.minggu,
      hafalan.id_hafalan,
      hafalan.hafalan
    FROM 
      kelas
    JOIN 
      siswa ON kelas.id_kelas = siswa.id_kelas
    LEFT JOIN 
      hafalan ON siswa.nisn = hafalan.nisn AND MONTH(hafalan.bulan) = ?  -- Perbaikan di sini
    WHERE 
      kelas.nip = ?
    ORDER BY 
      kelas.id_kelas, hafalan.bulan, hafalan.minggu;
  `;

  db.query(sql, [currentMonth, nip], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const groupedResults = results.reduce((acc, curr) => {
      const { id_kelas, nama_kelas, nisn, nama_siswa, bulan, minggu, id_hafalan, hafalan } = curr;

      let kelasEntry = acc.find(entry => entry.id_kelas === id_kelas);

      if (!kelasEntry) {
        kelasEntry = {
          id_kelas,
          nama_kelas,
          siswa: []
        };
        acc.push(kelasEntry);
      }

      let siswaEntry = kelasEntry.siswa.find(entry => entry.nisn === nisn);

      if (!siswaEntry) {
        siswaEntry = {
          nisn,
          nama_siswa,
          hafalan: []
        };
        kelasEntry.siswa.push(siswaEntry);
      }

      let bulanEntry = siswaEntry.hafalan.find(entry => entry.bulan === bulan);

      if (!bulanEntry) {
        bulanEntry = {
          bulan: bulan,
          minggu: [
            { minggu: 1, id_hafalan: null, hafalan: "" },
            { minggu: 2, id_hafalan: null, hafalan: "" },
            { minggu: 3, id_hafalan: null, hafalan: "" },
            { minggu: 4, id_hafalan: null, hafalan: "" }
          ]
        };
        siswaEntry.hafalan.push(bulanEntry);
      }

      if (minggu) {
        bulanEntry.minggu[minggu - 1] = {
          minggu,
          id_hafalan,
          hafalan: hafalan || ""
        };
      }

      return acc;
    }, []);

    res.json(groupedResults);
  });
});


app.get('/hafalan/siswa/:nisn', (req, res) => {
  const { nisn } = req.params;
  let { bulan } = req.query;

  // Ambil bulan sekarang jika bulan tidak diberikan
  const currentMonth = bulan ? bulan.toString() : (new Date().getMonth() + 1).toString();

  const sql = `
    SELECT 
      hafalan.bulan,
      hafalan.minggu,
      hafalan.id_hafalan,
      hafalan.hafalan
    FROM 
      hafalan
    WHERE 
      hafalan.nisn = ? AND hafalan.bulan = ?
    ORDER BY 
      hafalan.bulan, hafalan.minggu;
  `;

  db.query(sql, [nisn, currentMonth], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Buat struktur data sesuai dengan format yang diinginkan
    const formattedResults = [];

    // Grup hasil berdasarkan bulan
    results.forEach(row => {
      // Pastikan bulan adalah string
      let bulanEntry = formattedResults.find(entry => entry.bulan === row.bulan.toString());

      if (!bulanEntry) {
        bulanEntry = {
          bulan: row.bulan.toString(),
          minggu: [
            { minggu: "1", id_hafalan: null, hafalan: "" },
            { minggu: "2", id_hafalan: null, hafalan: "" },
            { minggu: "3", id_hafalan: null, hafalan: "" },
            { minggu: "4", id_hafalan: null, hafalan: "" }
          ]
        };
        formattedResults.push(bulanEntry);
      }

      if (row.minggu) {
        bulanEntry.minggu[row.minggu - 1] = {
          minggu: row.minggu.toString(),
          id_hafalan: row.id_hafalan,
          hafalan: row.hafalan || ""
        };
      }
    });

    // Jika tidak ada hasil dari query, tetap tampilkan bulan dengan nilai default
    if (formattedResults.length === 0) {
      formattedResults.push({
        bulan: currentMonth,
        minggu: [
          { minggu: "1", id_hafalan: null, hafalan: "" },
          { minggu: "2", id_hafalan: null, hafalan: "" },
          { minggu: "3", id_hafalan: null, hafalan: "" },
          { minggu: "4", id_hafalan: null, hafalan: "" }
        ]
      });
    }

    res.json({ hafalan: formattedResults });
  });
});



app.get('/hafalan/kelas/:nip', (req, res) => {
  const { nip } = req.params;
  let { bulan } = req.query;

  // Ambil bulan sekarang jika bulan tidak diberikan
  const currentMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;

  // Query untuk mendapatkan NISN siswa berdasarkan NIP kelas
  const getNisnQuery = `
    SELECT 
      siswa.nisn
    FROM 
      kelas
    JOIN 
      siswa ON kelas.id_kelas = siswa.id_kelas
    WHERE 
      kelas.nip = ?;
  `;

  db.query(getNisnQuery, [nip], (err, nisnResults) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (nisnResults.length === 0) {
      return res.status(404).json({ message: "No students found for this NIP." });
    }

    const nisnList = nisnResults.map(row => row.nisn);
    
    // Prepare to fetch hafalan data for each NISN
    const getHafalanQuery = `
      SELECT 
        siswa.nisn,
        siswa.nama AS nama_siswa,
        hafalan.bulan,
        hafalan.minggu,
        hafalan.id_hafalan,
        hafalan.hafalan
      FROM 
        siswa
      LEFT JOIN 
        hafalan ON siswa.nisn = hafalan.nisn AND hafalan.bulan = ?
      WHERE 
        siswa.nisn IN (?)
      ORDER BY 
        hafalan.bulan, hafalan.minggu;
    `;

    db.query(getHafalanQuery, [currentMonth, nisnList], (err, hafalanResults) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const groupedResults = [];

      // Group by NISN and bulan
      hafalanResults.forEach(row => {
        let siswaEntry = groupedResults.find(entry => entry.nisn === row.nisn);

        if (!siswaEntry) {
          siswaEntry = {
            nisn: row.nisn,
            nama_siswa: row.nama_siswa,
            hafalan: []
          };
          groupedResults.push(siswaEntry);
        }

        let bulanEntry = siswaEntry.hafalan.find(entry => entry.bulan === row.bulan);

        if (!bulanEntry) {
          bulanEntry = {
            bulan: row.bulan,
            minggu: [
              { minggu: 1, id_hafalan: null, hafalan: "" },
              { minggu: 2, id_hafalan: null, hafalan: "" },
              { minggu: 3, id_hafalan: null, hafalan: "" },
              { minggu: 4, id_hafalan: null, hafalan: "" }
            ]
          };
          siswaEntry.hafalan.push(bulanEntry);
        }

        if (row.minggu) {
          bulanEntry.minggu[row.minggu - 1] = {
            minggu: row.minggu,
            id_hafalan: row.id_hafalan,
            hafalan: row.hafalan || ""
          };
        }
      });

      res.json(groupedResults);
    });
  });
});



app.post('/hafalan', (req, res) => {
  const { id_hafalan, nisn, bulan, minggu, hafalan } = req.body;

  if (!id_hafalan || !nisn || !bulan || !minggu || !hafalan) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  const sql = `
    INSERT INTO hafalan (id_hafalan, nisn, bulan, minggu, hafalan)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [id_hafalan, nisn, bulan, minggu, hafalan], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Hafalan berhasil ditambahkan', id: result.insertId });
  });
});

app.put('/hafalan/:id_hafalan', (req, res) => {
  const { id_hafalan } = req.params;
  const { nisn, bulan, minggu, hafalan } = req.body;

  if (!nisn || !bulan || !minggu || !hafalan) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  const sql = `
    UPDATE hafalan 
    SET nisn = ?, bulan = ?, minggu = ?, hafalan = ?
    WHERE id_hafalan = ?
  `;

  db.query(sql, [nisn, bulan, minggu, hafalan, id_hafalan], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Hafalan berhasil diperbarui' });
  });
});



app.get('/hafalan/siswabaru/:nisn', (req, res) => {
  const { nisn } = req.params;
  const { bulan } = req.query;

  // Jika ada query parameter bulan, gunakan bulan tersebut, jika tidak gunakan bulan saat ini
  const currentMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;

  const sql = `
    SELECT 
      kelas.id_kelas,
      kelas.nama_kelas,
      siswa.nisn,
      siswa.nama AS nama_siswa,
      hafalan.bulan,
      hafalan.minggu,
      hafalan.id_hafalan,
      hafalan.hafalan
    FROM 
      siswa
    JOIN 
      kelas ON siswa.id_kelas = kelas.id_kelas
    LEFT JOIN 
      hafalan ON siswa.nisn = hafalan.nisn
    WHERE 
      siswa.nisn = ? AND (MONTH(hafalan.bulan) = ? OR hafalan.bulan IS NULL)
    ORDER BY 
      kelas.id_kelas, hafalan.bulan, hafalan.minggu;
  `;

  db.query(sql, [nisn, currentMonth], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Jika tidak ada hafalan, tambahkan data mingguan kosong
    if (results.length === 0) {
      results.push(
        { minggu: 1, id_hafalan: null, hafalan: "" },
        { minggu: 2, id_hafalan: null, hafalan: "" },
        { minggu: 3, id_hafalan: null, hafalan: "" },
        { minggu: 4, id_hafalan: null, hafalan: "" }
      );
    }

    res.json(results);
  });
});

app.get('/hafalan', (req, res) => {
  const { bulan } = req.query;

  // Jika ada query parameter bulan, gunakan bulan tersebut, jika tidak gunakan bulan saat ini
  const currentMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;

  const sql = `
    SELECT 
      id_hafalan,
      nisn,
      bulan,
      minggu,
      hafalan
    FROM 
      hafalan
    WHERE 
      bulan = ?
    ORDER BY 
      bulan, minggu;
  `;

  db.query(sql, [currentMonth], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Jika tidak ada hafalan, tambahkan data mingguan kosong
    if (results.length === 0) {
      for (let week = 1; week <= 4; week++) {
        results.push({
          id_hafalan: null,
          nisn: null,
          bulan: currentMonth,
          minggu: week,
          hafalan: ""
        });
      }
    }

    res.json(results);
  });
});

app.get('/orangtua', (req, res) => {
  const sql = `
    SELECT 
      id_orangtua,
      Nama,
      alamat,
      no_telepon,
      pekerjaan,
      gaji,
      status
    FROM 
      orangtua;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});


app.get('/orangtua/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.query;

  let sql = `
    SELECT 
      orangtua.id_orangtua,
      orangtua.Nama AS nama_orangtua,
      orangtua.alamat,
      orangtua.no_telepon,
      orangtua.pekerjaan,
      orangtua.gaji,
      orangtua.status,
      siswa.nisn,
      siswa.nama AS nama_siswa
    FROM 
      orangtua
    LEFT JOIN 
      siswa ON `;

  // Tambahkan kondisi berdasarkan status
  if (status === 'ayah') {
    sql += `orangtua.id_orangtua = siswa.id_ayah `;
  } else if (status === 'ibu') {
    sql += `orangtua.id_orangtua = siswa.id_ibu `;
  } else {
    sql += `orangtua.id_orangtua = siswa.id_wali `;
  }

  sql += `WHERE orangtua.id_orangtua = ?`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Orang tua dengan ID tersebut tidak ditemukan' });
    }

    // Proses hasil query
    const orangtuaInfo = {
      id_orangtua: results[0].id_orangtua,
      nama_orangtua: results[0].nama_orangtua,
      alamat: results[0].alamat,
      no_telepon: results[0].no_telepon,
      pekerjaan: results[0].pekerjaan,
      gaji: results[0].gaji,
      status: results[0].status,
      daftar_siswa: []
    };

    // Mengisi daftar_siswa dengan data siswa
    results.forEach(row => {
      if (row.nisn) {
        orangtuaInfo.daftar_siswa.push({
          nisn: row.nisn,
          nama: row.nama_siswa
        });
      }
    });

    res.json(orangtuaInfo);
  });
});




app.post('/orangtua', (req, res) => {
  const { id_orangtua, nama, alamat, no_telepon, pekerjaan, gaji, status } = req.body;

  // Validasi data input
  if (!id_orangtua || !nama || !alamat || !no_telepon || !pekerjaan || !gaji || !status) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  // SQL query untuk mengecek apakah kombinasi nomor telepon, nama, dan alamat sudah ada
  const checkSql = `
    SELECT COUNT(*) AS count
    FROM orangtua
    WHERE no_telepon = ? AND nama = ? AND alamat = ?
  `;

  db.query(checkSql, [no_telepon, nama, alamat], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ error: 'Kombinasi nomor telepon, nama, dan alamat sudah ada di data sebelumnya' });
    }

    // SQL query untuk insert data ke tabel orangtua
    const insertSql = `
      INSERT INTO orangtua (id_orangtua, nama, alamat, no_telepon, pekerjaan, gaji, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [id_orangtua, nama, alamat, no_telepon, pekerjaan, gaji, status], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Data orang tua berhasil ditambahkan', id: results.insertId });
    });
  });
});



app.put('/orangtua/:id_orangtua', (req, res) => {
  const { id_orangtua } = req.params;
  const { nama, alamat, no_telepon, pekerjaan, gaji, status } = req.body;

  // Validasi data input
  if (!nama || !alamat || !no_telepon || !pekerjaan || !gaji || !status) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi' });
  }

  // SQL query untuk memperbarui data orang tua
  const updateSql = `
    UPDATE orangtua
    SET nama = ?, alamat = ?, no_telepon = ?, pekerjaan = ?, gaji = ?, status = ?
    WHERE id_orangtua = ?
  `;

  db.query(updateSql, [nama, alamat, no_telepon, pekerjaan, gaji, status, id_orangtua], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Data orang tua tidak ditemukan' });
    }
    
    res.status(200).json({ message: 'Data orang tua berhasil diperbarui' });
  });
});





// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
