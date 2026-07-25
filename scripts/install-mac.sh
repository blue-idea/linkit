#!/bin/bash
# Linkit macOS One-line Installer & Unquarantine Helper
# Usage: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/blue-idea/collection/main/scripts/install-mac.sh)"

set -e

echo "========================================================"
echo "  Linkit macOS Automated Installer"
echo "  Linkit macOS 一键自动化安装与授权脚本"
echo "========================================================"
echo ""

APP_DIR="/Applications"
TARGET_APP="${APP_DIR}/Linkit.app"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "🔍 Fetching latest Linkit release from GitHub..."
RELEASE_JSON=$(curl -s https://api.github.com/repos/blue-idea/collection/releases/latest)
DMG_URL=$(echo "$RELEASE_JSON" | grep -o 'https://[^"]*Linkit\.dmg' | head -n 1)

if [ -z "$DMG_URL" ]; then
  echo "❌ Failed to locate Linkit.dmg from GitHub Releases."
  exit 1
fi

DMG_PATH="${TMP_DIR}/Linkit.dmg"
echo "⬇️  Downloading Linkit.dmg..."
curl -L -o "$DMG_PATH" "$DMG_URL"

MOUNT_DIR="${TMP_DIR}/mount"
mkdir -p "$MOUNT_DIR"

echo "💿 Mounting DMG..."
hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

if [ -d "$TARGET_APP" ]; then
  echo "🗑️  Removing existing Linkit.app in /Applications..."
  rm -rf "$TARGET_APP" 2>/dev/null || sudo rm -rf "$TARGET_APP"
fi

echo "📦 Installing Linkit.app to /Applications..."
cp -R "${MOUNT_DIR}/Linkit.app" "$TARGET_APP" 2>/dev/null || sudo cp -R "${MOUNT_DIR}/Linkit.app" "$TARGET_APP"

echo "💿 Unmounting DMG..."
hdiutil detach "$MOUNT_DIR" -quiet

echo "🔓 Clearing quarantine attributes (Gatekeeper fix)..."
xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || sudo xattr -dr com.apple.quarantine "$TARGET_APP"

echo ""
echo "========================================================"
echo "✅ Installation Success / 安装成功！"
echo "You can now launch Linkit from your Applications folder."
echo "你现在可以在【应用程序】中直接运行并使用 Linkit。"
echo "========================================================"
