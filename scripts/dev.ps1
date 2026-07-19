# 以开发身份启动 Wails（AppData / Keychain 使用 Linkit-Dev，与正式版隔离）。
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
wails dev -tags dev @args
