param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('init', 'seed', 'reset', 'summary', 'serve', 'export')]
    [string]$Action,
    [switch]$ConfirmReset
)
# A named entry point; shared CLI mechanics remain in demo.ps1.
& (Join-Path $PSScriptRoot 'demo.ps1') -Action $Action -Dataset portfolio -ConfirmReset:$ConfirmReset
