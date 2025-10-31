# Backend Veritabanı Yedekleme Endpoint'i

## Endpoint: `GET /api/backup/database`

Bu endpoint, SQLite veritabanı dosyasını binary olarak indirmek için kullanılır.

### Özellikler

- **Method:** `GET`
- **Path:** `/api/backup/database`
- **Authentication:** Bearer token gerekli (JWT)
- **Response Type:** Binary (application/octet-stream)
- **Content-Disposition:** `attachment; filename="imalattakip-db-backup-YYYY-MM-DD.db"`

### Örnek Backend Implementation (Node.js/Express)

```javascript
// routes/backup.js veya benzeri
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth'); // JWT auth middleware

router.get('/database', auth, async (req, res) => {
  try {
    // Veritabanı dosyasının yolu
    const dbPath = path.join(__dirname, '../database/imalat.db');
    
    // Dosya var mı kontrol et
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Veritabanı dosyası bulunamadı' });
    }

    // Dosya istatistikleri
    const stats = fs.statSync(dbPath);
    
    // Response headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="imalattakip-db-backup-${new Date().toISOString().split('T')[0]}.db"`);
    res.setHeader('Content-Length', stats.size);
    
    // Dosyayı stream et
    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Database backup stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Veritabanı yedekleme hatası' });
      }
    });
    
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ error: 'Veritabanı yedekleme sırasında hata oluştu' });
  }
});

module.exports = router;
```

### Python/Flask Örneği

```python
from flask import Flask, send_file, jsonify
from functools import wraps
import os
from datetime import datetime

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Token gerekli'}), 401
        # Token doğrulama logic'i buraya
        return f(*args, **kwargs)
    return decorated

@app.route('/api/backup/database', methods=['GET'])
@token_required
def backup_database():
    try:
        db_path = os.path.join(os.path.dirname(__file__), 'database', 'imalat.db')
        
        if not os.path.exists(db_path):
            return jsonify({'error': 'Veritabanı dosyası bulunamadı'}), 404
        
        filename = f"imalattakip-db-backup-{datetime.now().strftime('%Y-%m-%d')}.db"
        return send_file(
            db_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Güvenlik Notları

1. **Authentication:** Endpoint mutlaka JWT token kontrolü yapmalı
2. **Authorization:** Sadece yetkili kullanıcılar (admin) erişebilmeli
3. **Rate Limiting:** Yedekleme işlemi rate limit'e tabi olmalı
4. **File Path Security:** Dosya yolu doğrulanmalı, path traversal saldırılarına karşı korunmalı

### Test Etme

```bash
# cURL ile test
curl -X GET \
  https://imalattakip-backend-production.up.railway.app/api/backup/database \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output backup.db
```

### Railway Deployment Notları

- Railway'da veritabanı dosyası genellikle `/tmp` veya persistent volume'da olur
- Dosya yolu environment variable olarak ayarlanmalı
- Production'da mutlaka authentication kontrol edilmeli

