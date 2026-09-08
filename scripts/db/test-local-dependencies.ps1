# Dedicated local dependency validation. Installed binary versions are evidence,
# not a substitute for revalidation against the deployment image versions.
param([string]$RedisBin='C:\Program Files\Redis', [int]$RedisPort=16389, [string]$PgBin='C:\Program Files\PostgreSQL\17\bin')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (Get-NetTCPConnection -LocalPort $RedisPort -State Listen -ErrorAction SilentlyContinue) { throw 'Redis test port occupied; no existing process was stopped' }
$server=Join-Path $RedisBin 'redis-server.exe'
if (!(Test-Path -LiteralPath $server)) { throw 'Redis binary missing' }
$dir=Join-Path $root ('.quality/redis-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$cfg=Join-Path $dir 'test.conf'
@("bind 127.0.0.1", "port $RedisPort", 'save ""', 'appendonly no', 'dir "."', 'logfile "redis.log"') | Set-Content -LiteralPath $cfg -Encoding ascii
$process=$null
try {
  $process=Start-Process -FilePath $server -ArgumentList ('"'+$cfg+'"') -WorkingDirectory $dir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dir 'stdout.log') -RedirectStandardError (Join-Path $dir 'stderr.log')
  $ready=$false
  for($i=0; $i -lt 20; $i++) {
    if($process.HasExited) { throw 'Dedicated Redis exited before readiness; inspect its retained logs' }
    $socket=[Net.Sockets.TcpClient]::new()
    try {
      if ($socket.ConnectAsync('127.0.0.1', $RedisPort).Wait(500)) {
        $stream=$socket.GetStream()
        $stream.ReadTimeout=500
        $stream.WriteTimeout=500
        $ping=[Text.Encoding]::ASCII.GetBytes("PING`r`n")
        $stream.Write($ping,0,$ping.Length)
        $buffer=[byte[]]::new(64)
        $n=$stream.Read($buffer,0,$buffer.Length)
        if([Text.Encoding]::ASCII.GetString($buffer,0,$n).StartsWith('+PONG')) { $ready=$true; break }
      }
    } catch { } finally { $socket.Dispose() }
    Start-Sleep -Milliseconds 250
  }
  if(!$ready) { throw 'Dedicated Redis failed readiness' }
  & (Join-Path $PSScriptRoot 'test-postgres.ps1') -PgBin $PgBin -FullIntegration -RedisUrl "redis://127.0.0.1:$RedisPort/15"
} finally {
  if($process) {
    # Only the exact process created above; never touch an existing Redis service.
    if(!$process.HasExited) { $process.Kill(); $process.WaitForExit() }
    $process.Dispose()
  }
}
