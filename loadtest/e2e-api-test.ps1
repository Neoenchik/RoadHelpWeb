$ErrorActionPreference = 'Stop'
$Base = if ($env:ROADHELP_API_URL) { $env:ROADHELP_API_URL } else { 'http://localhost:8080' }
$Web = if ($env:ROADHELP_WEB_URL) { $env:ROADHELP_WEB_URL } else { 'http://localhost:3000' }
$SkipWeb = $false

function Test-WebUp {
  try {
    Invoke-WebRequest -Uri $Web -UseBasicParsing -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-WebUp)) {
  Write-Host "[WARN] Frontend $Web is down - skipping web smoke tests" -ForegroundColor Yellow
  $SkipWeb = $true
}
$Otp = '1234'
$Results = [System.Collections.Generic.List[object]]::new()

function Record($name, $ok, $detail = '') {
  $Results.Add([pscustomobject]@{ Test = $name; Pass = $ok; Detail = $detail })
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  $color = if ($ok) { 'Green' } else { 'Red' }
  Write-Host "[$mark] $name" -ForegroundColor $color
  if ($detail) { Write-Host "       $detail" -ForegroundColor DarkGray }
}

function Send-Otp($phone) {
  Invoke-RestMethod -Method POST -Uri "$Base/api/auth/send-otp" -ContentType 'application/json' -Body (@{ phone = $phone; purpose = 'login' } | ConvertTo-Json)
}

function Login($phone, $role = 'USER') {
  Send-Otp $phone | Out-Null
  $r = Invoke-RestMethod -Method POST -Uri "$Base/api/auth/verify-otp" -ContentType 'application/json' -Body (@{ phone = $phone; otp = $Otp; purpose = 'login'; role = $role } | ConvertTo-Json)
  if (-not $r.access_token) { throw "No token for $phone" }
  return @{ Token = $r.access_token; User = $r.user; Headers = @{ Authorization = "Bearer $($r.access_token)" } }
}

function Try-Api($name, $scriptBlock) {
  try {
    & $scriptBlock
    Record $name $true
    return $true
  } catch {
    Record $name $false $_.Exception.Message
    return $false
  }
}

Write-Host ''
Write-Host '=== Road Help E2E API Tests ===' -ForegroundColor Cyan
Write-Host ''

Try-Api 'Swagger UI' { $s = Invoke-WebRequest -Uri "$Base/swagger/index.html" -UseBasicParsing; if ($s.StatusCode -ne 200) { throw "status $($s.StatusCode)" } }

if (-not $SkipWeb) {
  Try-Api 'Privacy page (web)' { $s = Invoke-WebRequest -Uri "$Web/privacy" -UseBasicParsing; if ($s.StatusCode -ne 200) { throw "status $($s.StatusCode)" } }
  Try-Api 'Login page (web)' { $s = Invoke-WebRequest -Uri "$Web/auth/login" -UseBasicParsing; if ($s.Content -notmatch 'privacy-consent') { throw 'consent checkbox missing' } }
}
Try-Api 'OTP reject wrong code' {
  Send-Otp '+79000000003' | Out-Null
  try {
    Invoke-RestMethod -Method POST -Uri "$Base/api/auth/verify-otp" -ContentType 'application/json' -Body '{"phone":"+79000000003","otp":"0000","purpose":"login"}' | Out-Null
    throw 'expected failure'
  } catch {
    if ($_.Exception.Response.StatusCode -notin @([Net.HttpStatusCode]::BadRequest, [Net.HttpStatusCode]::Unauthorized)) { throw $_ }
  }
}

$admin = Login '+79000000001'
$operator = Login '+79000000002'
$client = Login '+79000000003'
$executor = Login '+79000000004'
Record 'Login ADMIN' ($admin.User.role -eq 'ADMIN') $admin.User.role
Record 'Login OPERATOR' ($operator.User.role -eq 'OPERATOR') $operator.User.role
Record 'Login USER' ($client.User.role -eq 'USER') $client.User.role
Record 'Login EXECUTOR' ($executor.User.role -eq 'EXECUTOR') $executor.User.role

Try-Api 'Unauthorized without token' {
  try {
    Invoke-RestMethod -Uri "$Base/api/admin/dashboard" | Out-Null
    throw 'expected 401'
  } catch {
    if ($_.Exception.Response.StatusCode -ne [Net.HttpStatusCode]::Unauthorized) { throw $_ }
  }
}

Try-Api 'Client payment methods' {
  $pm = Invoke-RestMethod -Uri "$Base/api/users/me/payment-methods" -Headers $client.Headers
  if ($null -eq $pm) { throw 'empty response' }
}
Try-Api 'Client order history' {
  $h = Invoke-RestMethod -Uri "$Base/api/orders/history" -Headers $client.Headers
  if ($null -eq $h) { throw 'empty' }
}
$orderId = $null
Try-Api 'Client create order' {
  $o = Invoke-RestMethod -Method POST -Uri "$Base/api/orders" -Headers $client.Headers -ContentType 'application/json' -Body (@{
    service_type = 'tow'
    lat = 55.751
    lng = 37.618
    address = 'E2E test address'
    description = 'Automated test order'
  } | ConvertTo-Json)
  if (-not $o.id) { throw 'no order id' }
  $script:orderId = $o.id
  Record '  order id' $true $o.id
}
if ($orderId) {
  Try-Api 'Client get order' {
    $d = Invoke-RestMethod -Uri "$Base/api/orders/$orderId" -Headers $client.Headers
    if ($d.status -ne 'PENDING') { throw "status=$($d.status)" }
  }
  Try-Api 'Client list executors for order' {
    $ex = Invoke-RestMethod -Uri "$Base/api/orders/$orderId/executors" -Headers $client.Headers
    if ($ex.Count -lt 1) { throw 'no executors' }
  }
}

Try-Api 'Executor profile' {
  $p = Invoke-RestMethod -Uri "$Base/api/executors/me" -Headers $executor.Headers
  if ($p.verification_status -ne 'VERIFIED') { throw $p.verification_status }
}
Try-Api 'Executor incoming orders' {
  Invoke-RestMethod -Uri "$Base/api/executors/orders/incoming" -Headers $executor.Headers | Out-Null
}
Try-Api 'Executor set online' {
  Invoke-RestMethod -Method PATCH -Uri "$Base/api/executors/me/status" -Headers $executor.Headers -ContentType 'application/json' -Body '{"online_status":"ONLINE"}' | Out-Null
}

Try-Api 'Admin dashboard' {
  $d = Invoke-RestMethod -Uri "$Base/api/admin/dashboard" -Headers $admin.Headers
  if ($d.users_total -lt 1) { throw 'users_total=0' }
}
Try-Api 'Admin orders list' {
  $o = Invoke-RestMethod -Uri "$Base/api/admin/orders?limit=5" -Headers $admin.Headers
  if ($o.total -lt 1) { throw 'no orders' }
}
Try-Api 'Admin executors' {
  Invoke-RestMethod -Uri "$Base/api/admin/executors" -Headers $admin.Headers | Out-Null
}
Try-Api 'Admin users' {
  Invoke-RestMethod -Uri "$Base/api/admin/users" -Headers $admin.Headers | Out-Null
}
Try-Api 'Admin broadcast validation' {
  try {
    Invoke-RestMethod -Method POST -Uri "$Base/api/admin/broadcast" -Headers $admin.Headers -ContentType 'application/json' -Body '{"title":"t","message":"   "}' | Out-Null
    throw 'expected 400'
  } catch {
    if ($_.Exception.Response.StatusCode -ne [Net.HttpStatusCode]::BadRequest) { throw $_ }
  }
}
Try-Api 'Admin broadcast send' {
  $b = Invoke-RestMethod -Method POST -Uri "$Base/api/admin/broadcast" -Headers $admin.Headers -ContentType 'application/json' -Body '{"title":"E2E","message":"test","role":"USER"}'
  if ($b.sent -lt 1) { throw "sent=$($b.sent)" }
}

Try-Api 'Admin invite create and revoke' {
  $inv = Invoke-RestMethod -Method POST -Uri "$Base/api/admin/invites" -Headers $admin.Headers -ContentType 'application/json' -Body '{"email":"e2e-ci@example.com","role":"OPERATOR"}'
  if (-not $inv.id) { throw 'no invite id' }
  Invoke-RestMethod -Method DELETE -Uri "$Base/api/admin/invites/$($inv.id)" -Headers $admin.Headers | Out-Null
}

Try-Api 'Admin order detail' {
  $o = Invoke-RestMethod -Uri "$Base/api/admin/orders?limit=1" -Headers $admin.Headers
  if ($o.items.Count -lt 1) { throw 'no orders' }
  Invoke-RestMethod -Uri "$Base/api/admin/orders/$($o.items[0].id)" -Headers $admin.Headers | Out-Null
}

Try-Api 'Operator metrics' {
  Invoke-RestMethod -Uri "$Base/api/operator/metrics" -Headers $operator.Headers | Out-Null
}
Try-Api 'Operator active orders with coords' {
  $a = Invoke-RestMethod -Uri "$Base/api/operator/active-orders" -Headers $operator.Headers
  if ($a.Count -gt 0 -and ($null -eq $a[0].lat)) { throw 'missing lat' }
}
Try-Api 'Operator disputes' {
  Invoke-RestMethod -Uri "$Base/api/operator/disputes" -Headers $operator.Headers | Out-Null
}
Try-Api 'Admin can access operator metrics' {
  Invoke-RestMethod -Uri "$Base/api/operator/metrics" -Headers $admin.Headers | Out-Null
}

if (-not $SkipWeb) {
  $pages = @('/', '/auth/login', '/privacy', '/become-executor', '/admin', '/operator', '/app', '/executor')
  foreach ($p in $pages) {
    Try-Api "Web page $p" {
      $s = Invoke-WebRequest -Uri "$Web$p" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
      if ($s.StatusCode -ge 400) { throw "status $($s.StatusCode)" }
    }
  }
}

$passed = @($Results | Where-Object { $_.Pass }).Count
$failed = @($Results | Where-Object { -not $_.Pass }).Count
$summaryColor = if ($failed -eq 0) { 'Green' } else { 'Yellow' }
Write-Host ''
Write-Host "=== SUMMARY: $passed passed, $failed failed ===" -ForegroundColor $summaryColor
Write-Host ''
if ($failed -gt 0) {
  $Results | Where-Object { -not $_.Pass } | Format-Table Test, Detail -AutoSize
  exit 1
}
exit 0
