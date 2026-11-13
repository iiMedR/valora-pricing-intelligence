param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('init', 'seed', 'reset', 'summary', 'serve', 'export')]
    [string]$Action,
    [long]$Seed = 20250101,
    [string]$StartDate = '2025-01-01',
    [ValidateSet('legacy', 'portfolio')]
    [string]$Dataset = 'legacy',
    [switch]$ConfirmReset
)

$ErrorActionPreference = 'Stop'
$demoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$portfolio = $Dataset -eq 'portfolio'
if ($portfolio) {
    if (($PSBoundParameters.ContainsKey('Seed') -and $Seed -ne 20251114) -or $StartDate -ne '2025-01-01') {
        throw 'portfolio-v1 has a frozen seed/date. No changed design will be seeded.'
    }
    $Seed = 20251114
}
$demoAdminVariable = if ($portfolio) { 'PORTFOLIO_ADMIN_PASSWORD' } else { 'DEMO_ADMIN_PASSWORD' }
$demoAppVariable = if ($portfolio) { 'PORTFOLIO_DB_PASSWORD' } else { 'DEMO_DB_PASSWORD' }
$demoProfiles = if ($portfolio) { 'demo,portfolio' } else { 'demo' }
$demoEnvFile = Join-Path $demoRoot $(if ($portfolio) { 'infra/.env.portfolio.local' } else { 'infra/.env.demo.local' })
$demoCompose = Join-Path $demoRoot $(if ($portfolio) { 'infra/compose.portfolio.yaml' } else { 'infra/compose.demo.yaml' })
$null = [datetime]::ParseExact($StartDate, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)

if ($Action -eq 'reset' -and -not $ConfirmReset) {
    throw 'Reset refused. Use reset -ConfirmReset only to replace the isolated synthetic demo dataset.'
}
if (-not (Test-Path -LiteralPath $demoEnvFile)) {
    if ($Action -ne 'init') { throw 'The isolated demo is not initialized. Run ./scripts/demo.ps1 init first.' }
    $demoAdminSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $demoAppSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    [IO.File]::WriteAllText($demoEnvFile, "${demoAdminVariable}=$demoAdminSecret`n${demoAppVariable}=$demoAppSecret`n")
    Write-Host 'Created Git-ignored local demo credentials. Keep this file private and retain it with the demo volume.'
}

$priorDemoEnvironment = @{}
try {
    foreach ($line in [IO.File]::ReadAllLines($demoEnvFile)) {
        if ($line -match ('^('+$demoAdminVariable+'|'+$demoAppVariable+')=(.+)$')) {
            $demoVariable = $Matches[1]
            $priorDemoEnvironment[$demoVariable] = [Environment]::GetEnvironmentVariable($demoVariable, 'Process')
            [Environment]::SetEnvironmentVariable($demoVariable, $Matches[2], 'Process')
        }
    }
    if (-not [Environment]::GetEnvironmentVariable($demoAppVariable, 'Process') -or -not [Environment]::GetEnvironmentVariable($demoAdminVariable, 'Process')) { throw 'Demo credentials are missing.' }
    if ($Action -eq 'init') {
        & docker compose --env-file $demoEnvFile -f $demoCompose --profile demo up -d --wait
        if ($LASTEXITCODE -ne 0) { throw 'The isolated demo PostgreSQL service could not start. No seeding was attempted.' }
    }
    Push-Location (Join-Path $demoRoot 'backend')
    try {
        if ($Action -eq 'serve') {
            & .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=$demoProfiles"
        } else {
            $demoCommand = if ($Action -eq 'init') { 'seed' } else { $Action }
            $demoArguments = "--spring.main.web-application-type=none --demo.action=$demoCommand --demo.seed=$Seed --demo.start-date=$StartDate"
            if ($Action -eq 'reset') { $demoArguments += ' --demo.confirm-reset=RESET_SYNTHETIC_DEMO' }
            & .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=$demoProfiles" "-Dspring-boot.run.arguments=$demoArguments"
        }
        if ($LASTEXITCODE -ne 0) { throw 'The demo command failed. No normal database reset is permitted; inspect the reported safety/validation error.' }
    } finally { Pop-Location }
} finally {
    foreach ($demoVariable in $priorDemoEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($demoVariable, $priorDemoEnvironment[$demoVariable], 'Process')
    }
}
