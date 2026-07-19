#!/usr/bin/env bash
# 以开发身份启动 Wails（AppData / Keychain 使用 Linkit-Dev，与正式版隔离）。
set -euo pipefail
cd "$(dirname "$0")/.."
exec wails dev -tags dev "$@"
