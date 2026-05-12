#!/bin/bash
# 经纬科技 · PostgreSQL 每日自动备份
# 每天 03:00 cron 触发；保留最近 14 天；压缩 gzip
# 备份路径：/www/shangcheng/backups/YYYYMMDD.sql.gz

set -e

BACKUP_DIR="/www/shangcheng/backups"
TS=$(date +%Y%m%d_%H%M)
OUT="${BACKUP_DIR}/${TS}.sql.gz"
RETAIN_DAYS=14

mkdir -p "${BACKUP_DIR}"

# pg_dump 通过 docker exec 到 shangcheng-postgres 容器
docker exec shangcheng-postgres pg_dump -U shangcheng shangcheng_mall \
  | gzip > "${OUT}"

# 检查产物大小，太小可能失败
SIZE=$(stat -c%s "${OUT}" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date)] 备份产物异常小（${SIZE} bytes），可能失败: ${OUT}" >&2
  exit 1
fi

# 清理超过 14 天的旧备份
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +${RETAIN_DAYS} -delete

echo "[$(date)] 备份完成: ${OUT} (${SIZE} bytes)"
