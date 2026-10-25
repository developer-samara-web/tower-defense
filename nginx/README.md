# Сертификаты для сервера

## Быстрый старт (самоподписанные)
```bash
sh scripts/generate-certs.sh
```

## Let's Encrypt (production)
```bash
# Установить certbot
sudo apt install certbot

# Остановить nginx, получить сертификат
certbot certonly --standalone -d your-domain.com

# Скопировать в nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Автообновление
sudo certbot renew --post-hook "docker-compose restart nginx"
```
