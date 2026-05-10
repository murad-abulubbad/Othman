$cloud  = 'dpo1udlqv'
$key    = '832992313975398'
$secret = 'Kkhn4d1ww0Bd4KTvH4wRRD_AmxA'
$creds  = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($key + ':' + $secret))

# Update the preset to be unsigned using JSON body
$body = '{"unsigned":true}'
$r = Invoke-RestMethod `
  -Uri "https://api.cloudinary.com/v1_1/$cloud/upload_presets/ofg_store" `
  -Method Put `
  -Headers @{ Authorization = "Basic $creds"; 'Content-Type' = 'application/json' } `
  -Body $body

Write-Host "Updated: $($r.name) | Unsigned: $($r.unsigned)"
