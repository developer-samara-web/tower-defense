#!/bin/sh
# Генерация самоподписанных SSL-сертификатов для nginx в Docker
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost/O=TowerDefense/C=RU"
echo "Self-signed certs created in nginx/ssl/"
