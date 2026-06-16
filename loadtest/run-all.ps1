$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== Road Help: full test run ===`n" -ForegroundColor Cyan

Write-Host "[1/4] Backend unit tests..." -ForegroundColor Yellow
Push-Location (Join-Path $Root 'web\apps\RoadHelp.Tests')
dotnet test --nologo -v q
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "`n[2/4] E2E API smoke..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'e2e-api-test.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[3/4] E2E order lifecycle..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'e2e-order-flow.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[4/4] E2E order FSM..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'e2e-fsm-flow.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== All tests passed ===`n" -ForegroundColor Green
