param([string]$PgBin = 'C:\Program Files\PostgreSQL\17\bin', [int]$Port = 55448, [switch]$FullIntegration, [string]$RedisUrl = '')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (!(Test-Path -LiteralPath (Join-Path $PgBin 'initdb.exe'))) { throw 'PostgreSQL binaries not found; set -PgBin' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Test port already in use; no process was stopped' }
$dir = Join-Path $root ('.quality/pg-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$data = Join-Path $dir 'data'
# Redirect native output to files: inherited PostgreSQL handles can otherwise keep
# PowerShell's native pipeline open after pg_ctl has already exited on Windows.
function Invoke-PgTool([string]$Tool, [string[]]$ToolArgs) {
  $log = Join-Path $dir ($Tool + '-' + [Guid]::NewGuid().ToString('N'))
  $quoted = ($ToolArgs | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }) -join ' '
  $p = Start-Process -FilePath (Join-Path $PgBin $Tool) -ArgumentList $quoted -WindowStyle Hidden -PassThru -RedirectStandardOutput ($log + '.out') -RedirectStandardError ($log + '.err')
  try {
    if (!$p.WaitForExit(60000)) {
      $p.Kill()
      throw "PostgreSQL helper timed out: $Tool"
    }
    $p.WaitForExit()
    Get-Content -LiteralPath ($log + '.out') -ErrorAction SilentlyContinue | Write-Output
    Get-Content -LiteralPath ($log + '.err') -ErrorAction SilentlyContinue | Write-Output
    if ($p.ExitCode -ne 0) { throw "PostgreSQL helper failed: $Tool ($($p.ExitCode))" }
  } finally { $p.Dispose() }
}
$oldUrl = $env:DATABASE_URL
$oldAllow = $env:ALLOW_DATABASE_TESTS
$oldRedis = $env:REDIS_URL
$started = $false
try {
  Invoke-PgTool 'initdb.exe' @('-D', $data, '-U', 'optimization', '-A', 'trust', '--encoding=UTF8', '--locale=C')
  Invoke-PgTool 'pg_ctl.exe' @('start', '-D', $data, '-l', (Join-Path $dir 'postgres.log'), '-o', "-h 127.0.0.1 -p $Port", '-w')
  $started = $true
  Invoke-PgTool 'createdb.exe' @('-h', '127.0.0.1', '-p', "$Port", '-U', 'optimization', 'optimization_test')
  $env:DATABASE_URL = "postgresql://optimization@127.0.0.1:$Port/optimization_test?schema=public"
  $env:ALLOW_DATABASE_TESTS = '1'
  $env:REDIS_URL = $RedisUrl
  Push-Location $root
  try {
    if (!$FullIntegration) {
      & node --test scripts/db/migrate.integration.mjs
      if ($LASTEXITCODE -ne 0) { throw 'Migration integration tests failed' }
    }
    & pnpm --filter '@jiujiu/server' db:push:test
    if ($LASTEXITCODE -ne 0) { throw 'Test schema creation failed' }
    if ($FullIntegration) { & pnpm test:integration }
    else { & pnpm --filter '@jiujiu/server' exec jest --config jest.integration.config.js --runInBand workbook.it.spec.ts }
    if ($LASTEXITCODE -ne 0) { throw 'Workbook database tests failed' }
  } finally { Pop-Location }
} finally {
  try {
    if ($started -or (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid'))) {
      Invoke-PgTool 'pg_ctl.exe' @('stop', '-D', $data, '-m', 'fast', '-w')
    }
  } finally {
    $env:DATABASE_URL = $oldUrl
    $env:ALLOW_DATABASE_TESTS = $oldAllow
    $env:REDIS_URL = $oldRedis
  }
}
# Evidence and data are retained under .quality; this script deletes nothing.
