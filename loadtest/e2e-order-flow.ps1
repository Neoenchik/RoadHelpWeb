$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8080'
$Otp = '1234'
$Failed = $false

function Get-Token($phone) {
  Invoke-RestMethod -Method POST -Uri "$Base/api/auth/send-otp" -ContentType 'application/json' -Body (@{ phone = $phone; purpose = 'login' } | ConvertTo-Json) | Out-Null
  return (Invoke-RestMethod -Method POST -Uri "$Base/api/auth/verify-otp" -ContentType 'application/json' -Body (@{ phone = $phone; otp = $Otp; purpose = 'login' } | ConvertTo-Json)).access_token
}

function Check($name, $scriptBlock) {
  try {
    & $scriptBlock
    Write-Host "[PASS] $name" -ForegroundColor Green
  } catch {
    $script:Failed = $true
    Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
  }
}

$clientToken = Get-Token '+79000000003'
$execToken = Get-Token '+79000000004'
$ch = @{ Authorization = "Bearer $clientToken" }
$eh = @{ Authorization = "Bearer $execToken" }

Write-Host "`n--- Order lifecycle ---" -ForegroundColor Cyan

$orderId = $null
Check 'Create order' {
  $o = Invoke-RestMethod -Method POST -Uri "$Base/api/orders" -Headers $ch -ContentType 'application/json' -Body (@{
    service_type = 'battery'; lat = 55.753; lng = 37.619; address = 'Lifecycle E2E'
  } | ConvertTo-Json)
  $script:orderId = $o.id
  if (-not $orderId) { throw 'no id' }
}

Check 'List executors' {
  $ex = Invoke-RestMethod -Uri "$Base/api/orders/$orderId/executors" -Headers $ch
  if ($ex.Count -lt 1) { throw 'no executors' }
}

Check 'Executor accept' {
  Invoke-RestMethod -Method PATCH -Uri "$Base/api/executors/me/status" -Headers $eh -ContentType 'application/json' -Body '{"online_status":"ONLINE"}' | Out-Null
  Invoke-RestMethod -Method POST -Uri "$Base/api/executors/orders/$orderId/accept" -Headers $eh -ContentType 'application/json' -Body '{}' | Out-Null
  $st = (Invoke-RestMethod -Uri "$Base/api/orders/$orderId" -Headers $ch).status
  if ($st -ne 'ACCEPTED') { throw "status=$st" }
}

Check 'Cancel order' {
  $o2 = Invoke-RestMethod -Method POST -Uri "$Base/api/orders" -Headers $ch -ContentType 'application/json' -Body (@{
    service_type = 'tire'; lat = 55.75; lng = 37.61; address = 'Cancel test'
  } | ConvertTo-Json)
  Invoke-RestMethod -Method POST -Uri "$Base/api/orders/$($o2.id)/cancel" -Headers $ch -ContentType 'application/json' -Body '{"reason":"e2e cancel"}' | Out-Null
  $st = (Invoke-RestMethod -Uri "$Base/api/orders/$($o2.id)" -Headers $ch).status
  if ($st -ne 'CANCELLED') { throw "status=$st" }
}

Check 'USER blocked from admin API' {
  try {
    Invoke-RestMethod -Uri "$Base/api/admin/dashboard" -Headers $ch | Out-Null
    throw 'expected 403'
  } catch {
    if ($_.Exception.Response.StatusCode -ne [Net.HttpStatusCode]::Forbidden) { throw $_ }
  }
}

if ($Failed) { exit 1 }
exit 0
