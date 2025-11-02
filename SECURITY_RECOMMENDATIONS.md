# Güvenlik Önerileri ve Önlemler

## 🔴 Kritik Güvenlik Açıkları

### 1. XSS (Cross-Site Scripting) Riskleri

**Sorun:** `App.tsx` dosyasında `innerHTML` kullanımı XSS saldırılarına açık:
```450:450:frontend/src/App.tsx
e.currentTarget.parentElement!.innerHTML = '<span style="font-size: 24px">💍</span>';
```

**Önlem:**
- `innerHTML` yerine React'ın güvenli render yöntemini kullanın
- DOM manipülasyonu yerine state-based rendering kullanın

### 2. Token Storage - XSS Riski

**Sorun:** Authentication token'ı localStorage'da saklanıyor:
```206:207:frontend/src/services/apiService.ts
localStorage.setItem('authToken', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

**Önlem:**
- HttpOnly cookies kullanın (backend'de)
- Token'ları memory'de saklayın veya secure cookie kullanın
- XSS saldırılarına karşı Content Security Policy (CSP) ekleyin

### 3. Hassas Bilgi Loglama

**Sorun:** Console.log'larda kullanıcı bilgileri loglanıyor:
```209:209:frontend/src/services/apiService.ts
console.log('✅ Login successful:', { userId: data.user.id, username: data.user.username });
```

**Önlem:**
- Production build'de console.log'ları kaldırın
- Hassas bilgileri loglamayın
- Loglama için environment-based kontroller ekleyin

## 🟡 Orta Seviye Güvenlik Açıkları

### 4. Input Validation

**Durum:** Frontend'de validation var ama backend'de de güçlü validation olmalı.

**Önlem:**
- Tüm input'ları backend'de validate edin
- SQL injection, NoSQL injection koruması ekleyin
- Rate limiting ekleyin (brute force koruması)

### 5. CORS Ayarları

**Durum:** Backend'de CORS ayarları kontrol edilmeli.

**Önlem:**
- CORS'u sadece güvenilir origin'lere izin verecek şekilde yapılandırın
- Credentials kontrolü yapın

### 6. HTTPS Zorunluluğu

**Durum:** API URL HTTPS kullanıyor ancak zorunluluk kontrol edilmeli.

**Önlem:**
- Tüm HTTP trafiğini HTTPS'e yönlendirin
- HSTS (HTTP Strict Transport Security) header'ı ekleyin

## 🟢 Güvenlik İyileştirmeleri

### 7. Content Security Policy (CSP)

**Önlem:**
- CSP header'ı ekleyin
- Inline script ve style kullanımını kısıtlayın

### 8. Session Timeout

**Durum:** Token timeout kontrolü eksik olabilir.

**Önlem:**
- Token expiry kontrolü ekleyin
- Otomatik logout mekanizması ekleyin
- Refresh token mekanizması düşünün

### 9. Password Policies

**Önlem:**
- Güçlü şifre politikaları uygulayın (min 8 karakter, büyük/küçük harf, rakam, özel karakter)
- Şifre hash'leme (backend'de bcrypt kullanın)
- Şifre değiştirme mekanizması ekleyin

### 10. API Rate Limiting

**Önlem:**
- Her endpoint için rate limiting ekleyin
- Brute force saldırılarına karşı özellikle login endpoint'ini koruyun

### 11. Error Handling

**Durum:** Error mesajları çok detaylı olabilir.

**Önlem:**
- Production'da detaylı error mesajlarını gizleyin
- Generic error mesajları gösterin
- Detaylı log'ları sadece server-side'da tutun

### 12. Dependency Security

**Önlem:**
- Düzenli olarak `npm audit` çalıştırın
- Güvenlik açığı olan paketleri güncelleyin
- `package-lock.json` dosyasını commit'leyin

### 13. Environment Variables

**Durum:** API URL environment variable'dan geliyor - iyi.

**Önlem:**
- Tüm hassas bilgileri environment variable'larda tutun
- `.env` dosyasını `.gitignore`'a ekleyin
- Production'da environment variable'ları güvenli şekilde yönetin

## 📋 Hemen Yapılması Gerekenler (Öncelikli)

1. ✅ `innerHTML` kullanımını kaldırın (App.tsx)
2. ✅ Production'da console.log'ları kaldırın
3. ✅ HttpOnly cookies kullanın (backend)
4. ✅ Input validation ekleyin (backend)
5. ✅ Rate limiting ekleyin (backend)

## 🛠️ Uygulama Adımları

### 1. innerHTML Kaldırma

`App.tsx` dosyasında:
- `innerHTML` yerine React state kullanın
- Logo yüklenemezse React component render edin

### 2. Console.log Temizleme

Production build'de:
- Webpack veya terser plugin ile console.log'ları kaldırın
- Environment-based logging ekleyin

### 3. Token Storage İyileştirme

Backend'de:
- JWT token'ları HttpOnly cookie'lerde saklayın
- Secure ve SameSite flag'leri ekleyin

### 4. CSP Header Ekleme

Backend'de veya nginx/caddy config'de:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

## 📚 Ek Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [JWT Security Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

