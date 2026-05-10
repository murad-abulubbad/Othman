$cloud  = 'dpo1udlqv'
$key    = '832992313975398'
$secret = 'Kkhn4d1ww0Bd4KTvH4wRRD_AmxA'
$creds  = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($key + ':' + $secret))

# Check current preset status
$r = Invoke-RestMethod `
  -Uri "https://api.cloudinary.com/v1_1/$cloud/upload_presets/ofg_store" `
  -Method Get `
  -Headers @{ Authorization = "Basic $creds" }

Write-Host "Full response:"
$r | ConvertTo-Json
