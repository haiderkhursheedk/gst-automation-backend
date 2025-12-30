# PowerShell script to test the GST verification service
# Usage: .\test-service.ps1 [GSTIN]

param(
    [string]$GSTIN = "27ABCDE1234F1Z5"
)

$API_URL = "http://localhost:3000/verify"

Write-Host "`nTesting GST Verification Service" -ForegroundColor Cyan
Write-Host "GSTIN: $GSTIN`n" -ForegroundColor Yellow

try {
    $body = @{
        gstin = $GSTIN
    } | ConvertTo-Json

    Write-Host "Sending request to $API_URL..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $API_URL -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "`n✅ Verification successful!`n" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Request failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    Write-Host "`nMake sure the server is running on http://localhost:3000" -ForegroundColor Yellow
}

