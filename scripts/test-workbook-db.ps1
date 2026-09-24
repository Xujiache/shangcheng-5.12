$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$testRoot = Join-Path $root 'packages/server/.workbook-test'
$data = Join-Path $testRoot 'pgdata'
$bin = 'C:\Program Files\PostgreSQL\17\bin'
$port = 55439
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Test port $port already in use; no process was stopped." }
if (!(Test-Path -LiteralPath $testRoot)) { New-Item -ItemType Directory -Path $testRoot | Out-Null }
if (!(Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
  & (Join-Path $bin 'initdb.exe') -D $data -U workbook -A trust --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'Test cluster initialization failed' }
}
& (Join-Path $bin 'pg_ctl.exe') start -D $data -l (Join-Path $testRoot 'postgres.log') -o "-h 127.0.0.1 -p $port" -w
if ($LASTEXITCODE -ne 0) { throw 'Test cluster start failed' }
try {
  $exists = & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p $port -U workbook -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='workbook_test'"
  if ($exists -ne '1') { & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p $port -U workbook workbook_test }
  $env:DATABASE_URL = "postgresql://workbook@127.0.0.1:$port/workbook_test?schema=public"
  Push-Location (Join-Path $root 'packages/server')
  try {
    & pnpm exec prisma db push --skip-generate
    if ($LASTEXITCODE -ne 0) { throw 'Test schema creation failed' }
    & pnpm exec jest --config jest.integration.config.js --runInBand workbook.it.spec.ts
    if ($LASTEXITCODE -ne 0) { throw 'Workbook database integration tests failed' }
  } finally { Pop-Location }
} finally {
  # Stop only the dedicated cluster this script started, never the installed service.
  & (Join-Path $bin 'pg_ctl.exe') stop -D $data -m fast -w
}
