param([string]$Username)
$ErrorActionPreference = 'Stop'
$adminRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Username) { $Username = Read-Host 'Local administrator account name' }
$adminSecurePassword = Read-Host 'New password (12+ characters; max 72 UTF-8 bytes)' -AsSecureString
$adminPreviousName = $env:ADMIN_USERNAME
$adminPreviousPassword = $env:ADMIN_PASSWORD
$adminPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecurePassword)
try {
    $env:ADMIN_USERNAME = $Username
    $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPasswordPointer)
    Push-Location (Join-Path $adminRoot 'backend')
    try {
        & .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local' '-Dspring-boot.run.arguments=--spring.main.web-application-type=none --auth.action=provision'
        if ($LASTEXITCODE -ne 0) { throw 'Administrator provisioning failed. Existing accounts were not replaced.' }
    } finally { Pop-Location }
} finally {
    $env:ADMIN_USERNAME = $adminPreviousName
    $env:ADMIN_PASSWORD = $adminPreviousPassword
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPasswordPointer)
    $adminSecurePassword.Dispose()
}
