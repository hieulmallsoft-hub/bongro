#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker chưa được cài trên server."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin chưa được cài trên server."
  exit 1
fi
if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "Đã tạo .env.production. Hãy sửa mật khẩu, APP_ORIGIN rồi chạy lại script."
  exit 2
fi
if grep -q 'CHANGE_TO_A_LONG_RANDOM_PASSWORD\|SERVER_IP' .env.production; then
  echo ".env.production vẫn còn giá trị mẫu. Hãy sửa trước khi triển khai."
  exit 2
fi

docker compose --env-file .env.production -f compose.prod.yaml config --quiet
docker compose --env-file .env.production -f compose.prod.yaml up -d --build
docker compose --env-file .env.production -f compose.prod.yaml ps

echo "HoopStars đã khởi động. Kiểm tra APP_ORIGIN trong .env.production để mở web."
