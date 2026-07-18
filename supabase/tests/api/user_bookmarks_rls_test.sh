#!/usr/bin/env bash
# 兼容 TASK 验证入口：转发到可在 Windows/Unix 运行的 Node API 测试。
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT_DIR/ui"
exec node ./scripts/supabase-rls-api-test.mjs
