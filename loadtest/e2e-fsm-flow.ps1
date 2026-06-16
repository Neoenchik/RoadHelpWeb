$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8080'
$Failed = $false

function Get-Token($phone) {
  Invoke-RestMethod -Method POST -Uri "$Base/api/auth/send-otp" -ContentType 'application/json' -Body (@{ phone = $phone; purpose = 'login' } | ConvertTo-Json) | Out-Null
  return (Invoke-RestMethod -Method POST -Uri "$Base/api/auth/verify-otp" -ContentType 'application/json' -Body (@{ phone = $phone; otp = '1234'; purpose = 'login' } | ConvertTo-Json)).access_token
}

function Step($name, $scriptBlock) {
  try {
    & $scriptBlock
    Write-Host "[PASS] $name" -ForegroundColor Green
  } catch {
    $script:Failed = $true
    Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n--- Order FSM ---" -ForegroundColor Cyan

$ct = Get-Token '+79000000003'
$et = Get-Token '+79000000004'
$ch = @{ Authorization = "Bearer $ct" }
$eh = @{ Authorization = "Bearer $et" }

$orderId = $null
Step 'Create + accept' {
  $o = Invoke-RestMethod -Method POST -Uri "$Base/api/orders" -Headers $ch -ContentType 'application/json' -Body (@{
    service_type = 'fuel'; lat = 55.754; lng = 37.62; address = 'FSM E2E'
  } | ConvertTo-Json)
  $script:orderId = $o.id
  Invoke-RestMethod -Method POST -Uri "$Base/api/executors/orders/$orderId/accept" -Headers $eh -ContentType 'application/json' -Body '{}' | Out-Null
}

foreach ($s in @('en-route', 'arrive', 'start', 'complete')) {
  Step $s {
    Invoke-RestMethod -Method POST -Uri "$Base/api/executors/orders/$orderId/$s" -Headers $eh -ContentType 'application/json' -Body '{}' | Out-Null
  }
}

Step 'Client confirm -> COMPLETED' {
  Invoke-RestMethod -Method POST -Uri "$Base/api/orders/$orderId/confirm" -Headers $ch -ContentType 'application/json' -Body '{}' | Out-Null
  $st = (Invoke-RestMethod -Uri "$Base/api/orders/$orderId" -Headers $ch).status
  if ($st -ne 'COMPLETED') { throw "status=$st" }
}

Step 'Pay order' {
  Invoke-RestMethod -Method POST -Uri "$Base/api/orders/$orderId/pay" -Headers $ch -ContentType 'application/json' -Body '{}' | Out-Null
}

if ($Failed) { exit 1 }
exit 0
