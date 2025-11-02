# Backend Güvenlik Yapılacaklar Listesi

## 🔴 Kritik Öncelik (Hemen Yapılmalı)

### 1. HttpOnly Cookies - Token Storage
**Durum:** Token'lar şu anda Bearer token olarak gönderiliyor, localStorage'da saklanıyor.

**Yapılacak:**
```javascript
// Login endpoint'inde token'ı cookie olarak gönder
res.cookie('authToken', token, {
  httpOnly: true,      // XSS koruması
  secure: true,        // HTTPS zorunlu (production)
  sameSite: 'strict',  // CSRF koruması
  maxAge: 24 * 60 * 60 * 1000 // 24 saat
});

// Token verify middleware'inde cookie'den oku
const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];
```

**Dosya:** `routes/auth.js`, `middleware/auth.js`

---

### 2. Rate Limiting - Brute Force Koruması
**Durum:** Login endpoint'i rate limiting olmadan çalışıyor.

**Yapılacak:**
```javascript
// express-rate-limit kullan
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 deneme
  message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

**Paket:** `npm install express-rate-limit`

**Dosya:** `routes/auth.js`

---

### 3. Input Validation - SQL Injection Koruması
**Durum:** Input validation eksik olabilir.

**Yapılacak:**
```javascript
// express-validator kullan
const { body, validationResult } = require('express-validator');

// Login validation
router.post('/login', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .escape()
    .withMessage('Kullanıcı adı 3-50 karakter arası olmalı'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter olmalı')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Login logic
});
```

**Paket:** `npm install express-validator`

**Dosya:** Tüm route dosyaları

---

### 4. SQL Injection Koruması - Parameterized Queries
**Durum:** PostgreSQL pool kullanılıyor, parametrized queries kontrol edilmeli.

**Kontrol Edilecek:**
```javascript
// ✅ DOĞRU - Parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE username = $1 AND password = $2',
  [username, hashedPassword]
);

// ❌ YANLIŞ - String concatenation (SQL injection riski)
const result = await pool.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

**Dosya:** Tüm database query dosyaları

---

### 5. Password Hashing - bcrypt Kontrolü
**Durum:** Şifreler hash'leniyor mu kontrol edilmeli.

**Yapılacak:**
```javascript
const bcrypt = require('bcrypt');

// Register
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Login
const isValid = await bcrypt.compare(password, user.password);
```

**Paket:** `npm install bcrypt`

**Dosya:** `routes/auth.js`

---

## 🟡 Orta Öncelik

### 6. CORS Ayarları
**Durum:** CORS ayarları kontrol edilmeli.

**Yapılacak:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-url.com',
  credentials: true, // Cookie gönderimi için
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Paket:** `npm install cors`

**Dosya:** `server.js`

---

### 7. Helmet.js - Security Headers
**Yapılacak:**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Paket:** `npm install helmet`

**Dosya:** `server.js`

---

### 8. Error Handling - Generic Messages
**Durum:** Detaylı error mesajları gönderiliyor olabilir.

**Yapılacak:**
```javascript
// Production'da detaylı error mesajlarını gizle
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Generic error mesajı
    return res.status(err.status || 500).json({
      error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    });
  }
  
  // Development'ta detaylı mesaj
  res.status(err.status || 500).json({
    error: err.message,
    stack: err.stack
  });
};

app.use(errorHandler);
```

**Dosya:** `server.js` veya `middleware/errorHandler.js`

---

### 9. Session Timeout - Token Expiry
**Yapılacak:**
```javascript
// JWT token expiry kontrolü
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // 24 saat
  );
};

// Middleware'de expiry kontrolü
const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi doldu' });
    }
    return res.status(401).json({ error: 'Geçersiz token' });
  }
};
```

**Dosya:** `middleware/auth.js`

---

### 10. Password Policies
**Yapılacak:**
```javascript
const passwordValidator = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Şifre en az 8 karakter olmalı' };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Şifre en az bir büyük harf içermeli' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Şifre en az bir küçük harf içermeli' };
  }
  if (!hasNumbers) {
    return { valid: false, message: 'Şifre en az bir rakam içermeli' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Şifre en az bir özel karakter içermeli' };
  }

  return { valid: true };
};
```

**Dosya:** `utils/validators.js`

---

## 🟢 Düşük Öncelik (İyileştirmeler)

### 11. Request Logging - Winston
**Yapılacak:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Production'da console'a yazma
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

**Paket:** `npm install winston`

---

### 12. Database Connection Pool - Max Connections
**Kontrol Edilecek:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maksimum connection sayısı
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### 13. Environment Variables Kontrolü
**Yapılacak:**
```javascript
// server.js başında
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FRONTEND_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ ${varName} environment variable bulunamadı!`);
    process.exit(1);
  }
});
```

---

### 14. API Documentation - Swagger
**Yapılacak:**
```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'İmalat Takip API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Paket:** `npm install swagger-jsdoc swagger-ui-express`

---

## 📦 Gerekli Paketler

```bash
npm install express-rate-limit express-validator bcrypt cors helmet winston swagger-jsdoc swagger-ui-express
```

---

## 📝 Yapılacaklar Özeti

### Hemen Yapılmalı:
1. ✅ HttpOnly cookies ekle (token için)
2. ✅ Rate limiting ekle (login endpoint)
3. ✅ Input validation ekle (express-validator)
4. ✅ SQL injection kontrolü (parametrized queries)
5. ✅ Password hashing kontrolü (bcrypt)

### Kısa Vadede:
6. ✅ CORS ayarları
7. ✅ Helmet.js (security headers)
8. ✅ Error handling (generic messages)
9. ✅ Token expiry kontrolü
10. ✅ Password policies

### Uzun Vadede:
11. ✅ Request logging (Winston)
12. ✅ Database connection pool ayarları
13. ✅ Environment variables kontrolü
14. ✅ API documentation (Swagger)

---

## 🔍 Kontrol Listesi

Backend repository'de kontrol edilecekler:

- [ ] `server.js` - CORS, Helmet, error handling
- [ ] `routes/auth.js` - Rate limiting, HttpOnly cookies, password hashing
- [ ] `middleware/auth.js` - Token expiry kontrolü
- [ ] Tüm route dosyaları - Input validation
- [ ] Database query dosyaları - Parameterized queries
- [ ] `package.json` - Güvenlik paketleri
- [ ] `.env.example` - Gerekli environment variables
- [ ] Error handling middleware

---

## 📚 Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

