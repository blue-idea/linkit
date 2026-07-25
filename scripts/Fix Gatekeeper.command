#!/bin/bash
# Linkit Gatekeeper Quarantine Remover & Installer Helper
# Double-click (or Right-click -> Open) to install and fix Linkit.app on macOS

echo "========================================================"
echo " Linkit Installer & Gatekeeper Fix Helper"
echo " Linkit macOS 一键安装与隔离属性修复工具"
echo "========================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DMG_APP_PATH="${SCRIPT_DIR}/Linkit.app"
TARGET_APP_PATH="/Applications/Linkit.app"

# 1. 如果 /Applications/Linkit.app 不存在，尝试从当前 DMG 目录自动安装
if [ ! -d "$TARGET_APP_PATH" ]; then
    if [ -d "$DMG_APP_PATH" ]; then
        echo "📦 Installing Linkit.app to /Applications ..."
        echo "   未在应用程序目录找到 Linkit，正在自动复制安装到 /Applications ..."
        cp -R "$DMG_APP_PATH" "$TARGET_APP_PATH" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "   需要系统权限以安装到 /Applications，正在请求权限..."
            sudo cp -R "$DMG_APP_PATH" "$TARGET_APP_PATH"
        fi
    else
        echo "⚠️  Linkit.app was not found in /Applications or current folder !"
        echo "   未在 /Applications 或当前目录下找到 Linkit.app。"
        echo "   Please drag Linkit.app to Applications, then run this script again."
        echo "   请将 Linkit.app 拖拽至 [应用程序 (Applications)] 文件夹后再试。"
        echo ""
        read -p "Press Enter to exit / 按回车键退出..." dummy
        exit 1
    fi
fi

# 2. 清除 com.apple.quarantine 属性
echo "🔓 Clearing quarantine attribute from $TARGET_APP_PATH ..."
echo "   正在移除 $TARGET_APP_PATH 的 macOS 隔离属性..."

xattr -dr com.apple.quarantine "$TARGET_APP_PATH" 2>/dev/null
STATUS=$?

if [ $STATUS -ne 0 ]; then
    echo "⚠️  Requesting permission to clear quarantine attribute..."
    echo "   需要系统权限，正在尝试通过 sudo 清理..."
    sudo xattr -dr com.apple.quarantine "$TARGET_APP_PATH"
    STATUS=$?
fi

if [ $STATUS -eq 0 ]; then
    echo ""
    echo "========================================================"
    echo "✅ Success / 安装与清理成功！"
    echo "You can now open Linkit from your Applications folder."
    echo "你现在可以直接在 [应用程序] 中启动并使用 Linkit。"
    echo "========================================================"
else
    echo ""
    echo "❌ Failed to clear quarantine attribute."
    echo "   清理隔离属性失败，请打开终端手动执行："
    echo "   sudo xattr -dr com.apple.quarantine /Applications/Linkit.app"
fi

echo ""
read -p "Press Enter to finish / 按回车键完成..." dummy
