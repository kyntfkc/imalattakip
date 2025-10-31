# Backend'e Veritabanı Yedekleme Endpoint'i Ekleme Rehberi

## Adımlar

### 1. Backend Repository'yi Klonla

```bash
git clone https://github.com/kyntfkc/imalattakip-backend.git
cd imalattakip-backend
```

### 2. Yeni Route Dosyası Oluştur

`routes/backup.js` dosyası oluştur ve `routes-backup.js` dosyasındaki içeriği kopyala.

### 3. server.js Dosyasına Route'u Ekle

`server.js` dosyasını aç ve şu satırları ekle:

```javascript
// Diğer route import'larından sonra
const backupRoutes = require('./routes/backup');

// Route middleware'lerinden sonra
app.use('/api/backup', backupRoutes);
```

Örnek:

```javascript
// server.js içinde
const authRoutes = require('./routes/auth');
const transferRoutes = require('./routes/transfers');
// ... diğer route'lar
const backupRoutes = require('./routes/backup'); // EKLE

// ... middleware'ler

app.use('/api/auth', authRoutes);
app.use('/api/transfers', transferRoutes);
// ... diğer route'lar
app.use('/api/backup', backupRoutes); // EKLE
```

### 4. Test Et (Local)

```bash
npm install  # Gerekirse
npm start
```

```bash
# Terminal'de test
curl -X GET \
  http://localhost:YOUR_PORT/api/backup/database \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output backup.sql
```

### 5. Commit ve Push

```bash
git add routes/backup.js
git add server.js
git commit -m "feat: PostgreSQL veritabanı yedekleme endpoint'i eklendi"
git push origin master
```

### 6. Railway'da Deploy

Railway otomatik olarak yeni commit'i deploy edecek. Veya manuel deploy yapın.

## Kontroller

- ✅ `routes/backup.js` oluşturuldu mu?
- ✅ `server.js`'e route eklendi mi?
- ✅ Auth middleware doğru import edildi mi?
- ✅ PostgreSQL pool doğru import edildi mi?
- ✅ Railway'da `DATABASE_URL` environment variable var mı?

## Notlar

- PostgreSQL kullanıldığı için `.sql` formatında yedek alınır
- `pg_dump` Railway'da genellikle yüklüdür
- Eğer `pg_dump` çalışmazsa, alternatif Node.js yöntemi devreye girer
- Sadece authenticated kullanıcılar erişebilir (auth middleware)

