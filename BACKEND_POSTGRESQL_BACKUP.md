# Backend PostgreSQL Veritabanı Yedekleme Endpoint'i

## Endpoint: `GET /api/backup/database`

Bu endpoint, PostgreSQL veritabanını SQL dump formatında indirmek için kullanılır.

### Özellikler

- **Method:** `GET`
- **Path:** `/api/backup/database`
- **Authentication:** Bearer token gerekli (JWT)
- **Response Type:** Text/SQL (application/sql veya text/plain)
- **Content-Disposition:** `attachment; filename="imalattakip-db-backup-YYYY-MM-DD.sql"`

### Backend Implementation (Node.js/Express + PostgreSQL)

Backend repository'de (`routes/backup.js` oluşturun):

```javascript
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const auth = require('../middleware/auth'); // Mevcut auth middleware'iniz
const pool = require('../database/postgresql'); // Mevcut PostgreSQL pool'unuz

const execAsync = promisify(exec);

router.get('/database', auth, async (req, res) => {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL bulunamadı' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `imalattakip-db-backup-${timestamp}.sql`;

    // pg_dump kullanarak SQL dump oluştur
    // Railway'da pg_dump genellikle yüklüdür
    const pgDumpCommand = `pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges`;

    const { stdout, stderr } = await execAsync(pgDumpCommand);

    if (stderr && !stderr.includes('WARNING')) {
      console.error('pg_dump error:', stderr);
      throw new Error('Veritabanı dump oluşturulamadı');
    }

    // SQL dump'ı gönder
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(stdout);

  } catch (error) {
    console.error('Database backup error:', error);
    
    // pg_dump yoksa alternatif yöntem: Node.js ile manuel export
    try {
      const backupSQL = await generateBackupSQL();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `imalattakip-db-backup-${timestamp}.sql`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(backupSQL);
    } catch (fallbackError) {
      console.error('Fallback backup error:', fallbackError);
      res.status(500).json({ 
        error: 'Veritabanı yedekleme sırasında hata oluştu',
        details: error.message 
      });
    }
  }
});

// Alternatif: pg_dump yoksa Node.js ile SQL oluştur
async function generateBackupSQL() {
  const client = await pool.connect();
  let sql = `-- PostgreSQL Database Backup
-- Generated: ${new Date().toISOString()}
-- Database: ${process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.substring(1) : 'imalattakip'}

BEGIN;
\\echo 'Dropping existing tables...'
`;

  try {
    // Tüm tabloları al
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows.map(row => row.tablename);

    // Her tablo için DROP ve CREATE
    for (const table of tables) {
      const tableDefResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, [table]);

      sql += `\n-- Table: ${table}\nDROP TABLE IF EXISTS ${table} CASCADE;\nCREATE TABLE ${table} (\n`;
      
      const columns = tableDefResult.rows.map((col, idx) => {
        let colDef = `  ${col.column_name} ${col.data_type}`;
        if (col.character_maximum_length) {
          colDef += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }
        return colDef;
      }).join(',\n');

      sql += columns + '\n);\n';

      // Verileri al
      const dataResult = await client.query(`SELECT * FROM ${table};`);
      
      if (dataResult.rows.length > 0) {
        sql += `\n-- Data for table ${table}\n`;
        for (const row of dataResult.rows) {
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          }).join(', ');
          
          const columns = Object.keys(row).join(', ');
          sql += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        }
      }
    }

    sql += '\nCOMMIT;';
    return sql;

  } finally {
    client.release();
  }
}

module.exports = router;
```

### Ana server.js'e Route Ekleme

```javascript
// server.js dosyasına ekleyin
const backupRoutes = require('./routes/backup');
app.use('/api/backup', backupRoutes);
```

### Alternatif: Daha Basit Yöntem (pg-promise ile)

Eğer `pg-promise` kullanıyorsanız:

```javascript
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../database/postgresql'); // pg-promise instance

router.get('/database', auth, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `imalattakip-db-backup-${timestamp}.sql`;
    
    // Tüm verileri JSON olarak al
    const tables = ['transfers', 'companies', 'users', 'cinsi', 'logs', 'dashboard_settings'];
    const backupData = {};
    
    for (const table of tables) {
      backupData[table] = await db.any(`SELECT * FROM ${table}`);
    }
    
    // JSON formatında gönder (veya SQL'e çevir)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="imalattakip-db-backup-${timestamp}.json"`);
    res.json({
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: backupData
    });
    
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ error: 'Veritabanı yedekleme sırasında hata oluştu' });
  }
});

module.exports = router;
```

### Güvenlik Notları

1. **Authentication:** Endpoint mutlaka JWT token kontrolü yapmalı
2. **Authorization:** Sadece admin kullanıcıları erişebilmeli (opsiyonel ama önerilen)
3. **Rate Limiting:** Yedekleme işlemi rate limit'e tabi olmalı
4. **Timeout:** Büyük veritabanları için timeout ayarlayın

### Test Etme

```bash
# cURL ile test
curl -X GET \
  https://imalattakip-backend-production.up.railway.app/api/backup/database \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output backup.sql
```

### Railway Deployment Notları

- Railway'da `pg_dump` genellikle yüklüdür
- Eğer yüklü değilse, Node.js ile manuel export yöntemini kullanın
- `DATABASE_URL` environment variable'ı otomatik olarak ayarlanır
- Production'da mutlaka authentication kontrol edilmeli

