$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $taskNode = $nodeCommand.Source }
else { $taskNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Installare Node.js 22 prima di continuare.' }
Write-Host 'Gestione locale Combriccola. Nessun piano a pagamento.'
$action = Read-Host 'Azione: create, reset, disable, enable'
if ($action -notin @('create','reset','disable','enable')) { throw 'Azione non valida.' }
$userName = Read-Host 'Username'
$nick = Read-Host 'Nickname (vuoto per usare lo username)'
if (-not $nick) { $nick = $userName }
& $taskNode functions/accounts-local.js $action $userName $nick --apply
if ($LASTEXITCODE -ne 0) { throw 'Operazione non completata. Leggere il messaggio precedente.' }
Read-Host 'Premi Invio per chiudere'

