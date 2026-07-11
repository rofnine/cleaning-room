$ErrorActionPreference = 'Stop'

$siteRoot = Split-Path -Parent $PSScriptRoot
$port = 8765
$url = "http://127.0.0.1:$port/"

$python = Get-Command python -ErrorAction SilentlyContinue
$arguments = @('-m', 'http.server', $port, '--bind', '127.0.0.1')

if (-not $python) {
    $python = Get-Command py -ErrorAction SilentlyContinue
    $arguments = @('-3', '-m', 'http.server', $port, '--bind', '127.0.0.1')
}

if (-not $python) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('Python을 찾을 수 없습니다. GitHub Pages 주소로 접속하거나 Python을 설치해주세요.', '사이트 실행 안내') | Out-Null
    exit 1
}

$alreadyRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $alreadyRunning) {
    Start-Process -FilePath $python.Source -ArgumentList $arguments -WorkingDirectory $siteRoot -WindowStyle Hidden
    Start-Sleep -Milliseconds 900
}

Start-Process $url
