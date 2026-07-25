#!/bin/bash
# Linkit Gatekeeper Quarantine Remover
# Usage: Double-click to remove com.apple.quarantine from /Applications/Linkit.app

echo "========================================================"
echo " Linkit Gatekeeper Quarantine Remover"
echo " 移除 Linkit 隔离属性 / 解决无法打开问题"
echo "========================================================"
echo ""

APP_PATH="/Applications/Linkit.app"

if [ ! -d "$APP_PATH" ]; then
    echo "⚠️  Linkit.app was not found in /Applications !"
    echo "   未在 /Applications 目录下找到 Linkit.app。"
    echo "   Please drag Linkit.app into the Applications folder first, then run this script again."
    echo "   请先将本 DMG 中的 Linkit.app 拖拽复制到 [应用程序 (Applications)] 文件夹中，然后再运行此脚本。"
    echo ""
    read -p "Press Enter to exit / 按回车键退出..." dummy
    exit 1
fi

echo "Clearing quarantine attribute from $APP_PATH ..."
echo "正在为 $APP_PATH 移除隔离属性..."

xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null
STATUS=$?

if [ $STATUS -eq 0 ]; then
    echo ""
    echo "========================================================"
    echo "✅ Success / 清理成功！"
    echo "You can now open Linkit from your Applications folder."
    echo "你现在可以直接在 [应用程序] 中打开并使用 Linkit。"
    echo "========================================================"
else
    echo ""
    echo "⚠️  System permission required, requesting sudo..."
    echo "   需要系统权限，尝试通过 sudo 移除..."
    sudo xattr -dr com.apple.quarantine "$APP_PATH"
    if [ $? -eq 0 ]; then
        echo ""
        echo "========================================================"
        echo "✅ Success / 清理成功！"
        echo "You can now open Linkit from your Applications folder."
        echo "你现在可以直接在 [应用程序] 中打开并使用 Linkit。"
        echo "========================================================"
    else
        echo ""
        echo "❌ Failed to clear quarantine attribute."
        echo "   清理隔离属性失败，请检查安装路径或手动运行："
        echo "   xattr -dr com.apple.quarantine /Applications/Linkit.app"
    fi
fi

echo ""
read -p "Press Enter to finish / 按回车键完成..." dummy
