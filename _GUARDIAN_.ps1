# AEGIS Guardian - Runs every 30 minutes
$folder = "C:\Users\Charles Kendrick\Desktop\New folder"
# Check for unauthorized access
Get-ChildItem "$folder\_DECOY_" | Where-Object { $_.LastAccessTime -gt (Get-Date).AddMinutes(-30) } | ForEach-Object {
    "$(Get-Date) - HONEYPOT ACCESSED: $($_.Name)" | Add-Content "$folder\_INTRUSION_LOG_.txt"
}
# Re-hide vault
attrib +h "$folder\_SECURE_VAULT_" 2>$null
