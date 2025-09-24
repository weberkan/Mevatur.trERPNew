# 🚀 Coolify ile Deployment Rehberi

Bu rehber, MevaERPSystem projesini Coolify üzerinden GitHub ile sorunsuz bir şekilde deploy etmek için adım adım talimatları içerir.

## 📋 Ön Gereksinimler

1. ✅ **GitHub Repository**: Projeniz GitHub'da olmalı
2. ✅ **Coolify Instance**: Çalışan Coolify sunucunuz olmalı
3. ✅ **PostgreSQL Database**: Database için Coolify'da PostgreSQL servisi

## 🛠️ Adım 1: GitHub Repository Hazırlığı

### 1.1 Değişiklikleri Commit Et
```bash
git add .
git commit -m "feat: Coolify deployment configuration"
git push origin main
```

### 1.2 Repository'yi Public Yap (Gerekirse)
- GitHub repository'nizi açın
- Settings → General → Change repository visibility → Make public

## 🐳 Adım 2: Coolify'da Proje Oluştur

### 2.1 New Resource Oluştur
1. Coolify dashboard'a gir
2. **"New Resource"** butonuna tıkla
3. **"Public Repository"** seç
4. GitHub repository URL'inizi girin: `https://github.com/username/repository-name`
5. Branch olarak **"main"** seç

### 2.2 Build Configuration
1. **Build Pack**: `Docker` seç
2. **Dockerfile Location**: `/Dockerfile` (default)
3. **Port**: `3000`
4. **Health Check Path**: `/` (optional)

## 🗃️ Adım 3: Database Kurulumu

### 3.1 PostgreSQL Service Ekle
1. Coolify'da yeni bir **PostgreSQL** servisi oluştur
2. Database bilgilerini not et:
   - Host
   - Port (genellikle 5432)
   - Database name
   - Username
   - Password

### 3.2 Database Schema'yı Import Et
```bash
# Eğer yerel database'iniz varsa dump alın:
pg_dump -h localhost -U your_user -d meva_erp > database_backup.sql

# Coolify PostgreSQL'e import edin
psql -h your-coolify-db-host -U postgres -d your_db_name < database_backup.sql
```

## 🔧 Adım 4: Environment Variables

Coolify'da proje ayarlarından **Environment Variables** bölümüne aşağıdaki değerleri ekleyin:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@db-host:5432/database_name
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=5432

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-production-2025-very-secure
NEXTAUTH_SECRET=your-nextauth-secret-production-very-secure
NEXTAUTH_URL=https://your-domain.example.com

# Application Settings
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

### 🔐 Güvenli Secret Üretimi
```bash
# JWT Secret için:
openssl rand -base64 64

# NextAuth Secret için:
openssl rand -base64 32
```

## 🌐 Adım 5: Domain ve SSL

### 5.1 Domain Ayarları
1. **Domains** sekmesine git
2. Domain'inizi ekleyin (örn: `meva-erp.yourdomain.com`)
3. **SSL Certificate** otomatik oluşturulsun

### 5.2 DNS Ayarları
Domain sağlayıcınızda A record ekleyin:
```
A record: meva-erp.yourdomain.com → Coolify-server-IP
```

## 🚀 Adım 6: Deploy

1. **"Deploy"** butonuna tıkla
2. Build loglarını takip et
3. Deploy tamamlandığında domain'inizi test et

## 🔍 Adım 7: Doğrulama ve Test

### 7.1 Health Check
```bash
curl -I https://your-domain.com
# HTTP/1.1 200 OK dönmeli
```

### 7.2 Database Bağlantısı Test
- Login sayfasını dene
- Database işlemlerini test et

## 🐛 Troubleshooting

### Build Hatası
```bash
# Coolify logs'unu kontrol et
# Docker build hatasıysa dependency'leri kontrol et
```

### Database Bağlantı Hatası
- Environment variables'ları kontrol et
- PostgreSQL servisinin çalıştığından emin ol
- Network connectivity test et

### Port Hatası
- Dockerfile'da EXPOSE 3000 var mı kontrol et
- Coolify'da port mapping doğru mu kontrol et

## 📊 Production Monitoring

### Logs
```bash
# Coolify dashboard'dan application logs'unu takip et
# Error monitoring için log level'ları ayarla
```

### Performance
- Database connection pooling
- Redis cache (opsiyonel)
- CDN usage

## 🔄 Sürekli Deployment

### Auto-deploy Ayarı
1. **Settings → General** 
2. **Auto Deploy** aktif et
3. Her push'da otomatik deploy olacak

### Webhook (Manuel)
```bash
curl -X POST "https://your-coolify-webhook-url"
```

## ✅ Checklist

- [ ] GitHub repository hazır
- [ ] Coolify'da proje oluşturuldu
- [ ] Environment variables eklendi
- [ ] PostgreSQL database kuruldu
- [ ] Domain ve SSL ayarlandı
- [ ] İlk deploy başarılı
- [ ] Application erişilebilir
- [ ] Database bağlantısı çalışıyor
- [ ] Auto-deploy ayarlandı

## 🆘 Destek

Sorun yaşarsanız:
1. Coolify logs'unu kontrol edin
2. GitHub repository'deki Dockerfile'ı test edin
3. Environment variables'ları doğrulayın

**Başarılı deploy'lar! 🎉**