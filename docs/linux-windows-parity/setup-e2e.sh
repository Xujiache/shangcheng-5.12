#!/bin/sh
set -eu
cd "$(dirname "$0")"
umask 077
python3 - <<'PY'
import os
from pathlib import Path
import secrets

compose = Path('.env')
runner = Path('runner.env')
if compose.exists() != runner.exists():
    raise SystemExit('Partial private environment; inspect it before rerunning')
if not compose.exists():
    values = {
        'PARITY_POSTGRES_PASSWORD': secrets.token_hex(24),
        'PARITY_REDIS_PASSWORD': secrets.token_hex(24),
        'PARITY_MINIO_USER': 'parity' + secrets.token_hex(8),
        'PARITY_MINIO_PASSWORD': secrets.token_hex(24),
        'PARITY_CONVERSION_PASSWORD_KEY': secrets.token_hex(32),
        'PARITY_JWT_SECRET': secrets.token_hex(32),
    }
    fd = os.open(compose, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.writelines(f'{key}={value}\n' for key, value in values.items())
    test_env = {
        'NODE_ENV': 'test',
        'ALLOW_DATABASE_TESTS': '1',
        'CONVERSION_TEST_API': 'http://127.0.0.1:3013',
        'DATABASE_URL': f'postgresql://parity:{values["PARITY_POSTGRES_PASSWORD"]}@127.0.0.1:5544/ledger_parity_test',
        'REDIS_URL': f'redis://:{values["PARITY_REDIS_PASSWORD"]}@127.0.0.1:6399/1',
        'JWT_SECRET': values['PARITY_JWT_SECRET'],
        'CONVERSION_PASSWORD_KEY': values['PARITY_CONVERSION_PASSWORD_KEY'],
    }
    fd = os.open(runner, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.writelines(f'{key}={value}\n' for key, value in test_env.items())
for file in (compose, runner):
    if file.stat().st_mode & 0o077:
        raise SystemExit(f'{file}: private environment permissions are too broad')
PY
docker compose --env-file .env -f e2e-compose.yml up -d postgres redis minio
