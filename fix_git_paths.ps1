$gitModulesPath = "C:\Users\hyper\workspace\.git\modules\AIOS\modules"

Get-ChildItem -Path $gitModulesPath -Recurse -Filter "config" | ForEach-Object {
    $configPath = $_.FullName
    $content = Get-Content -Path $configPath -Raw
    
    if ($content -match "aios") {
        Write-Host "Fixing $configPath"
        $newContent = $content -replace "aios", "borg"
        Set-Content -Path $configPath -Value $newContent
    }
}

Write-Host "Git path repair complete."
