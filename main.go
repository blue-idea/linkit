package main

import (
	"context"
	"embed"
	"log"
	"path/filepath"
	"runtime"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/ai"
	"github.com/blue-idea/collection/internal/health"
	"github.com/blue-idea/collection/internal/hotkey"
	"github.com/blue-idea/collection/internal/localstore"
	"github.com/blue-idea/collection/internal/metadata"
	"github.com/blue-idea/collection/internal/platform"
	"github.com/blue-idea/collection/internal/secretstore"
	"github.com/blue-idea/collection/internal/settingsstore"
	"github.com/blue-idea/collection/internal/tray"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

// REQ-024-AC-001：Wails 构建会将 ui/dist 同步到此嵌入目录。
//
//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/windows/icon.ico
var trayIconWindows []byte

//go:embed build/appicon.png
var trayIconPNG []byte

func main() {
	defaultRootDir, err := localstore.DefaultRootDir()
	if err != nil {
		log.Fatalf("Unable to get default root dir: %v", err)
	}

	settingsService, err := settingsstore.NewDefaultService()
	if err != nil {
		log.Fatalf("Unable to initialise settings service: %v", err)
	}
	localDocumentService, err := localstore.NewDefaultService(localstore.WithRootChanged(func(dataRoot string) {
		settingsService.SetRootDir(dataRoot)
	}))
	if err != nil {
		log.Fatalf("Unable to initialise local document service: %v", err)
	}
	secretService, err := secretstore.NewDefaultService()
	if err != nil {
		log.Fatalf("Unable to initialise secret service: %v", err)
	}

	windowRuntime := platform.NewWailsWindowRuntime(nil)
	hotkeyManager := hotkey.NewManager(hotkey.NewDesignBackend())
	nativeFileService := platform.NewService(
		platform.WithWindowRuntime(windowRuntime),
		platform.WithHotkeyManager(hotkeyManager),
	)
	_ = nativeFileService.WireHotkeyToggle()

	trayHost := tray.NewHost(tray.Callbacks{
		OnShow: func() { _ = nativeFileService.ShowMainWindow() },
		OnQuit: func() { _ = nativeFileService.QuitApplication() },
	})
	trayRunner := tray.NewSystrayRunner(trayHost, config.AppTitle, selectTrayIcon())

	metadataService := metadata.NewService()
	aiService := ai.NewDefaultService(
		ai.SecretKeyLoader{Secrets: secretService},
		ai.SettingsConsentChecker{Settings: settingsService},
	)
	healthEmitter := health.NewWailsEmitter()
	healthService := health.NewService(health.WithEmitter(healthEmitter))

	err = wails.Run(&options.App{
		Title:  config.AppTitle,
		Width:  config.AppWidth,
		Height: config.AppHeight,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{
			R: config.BackgroundRed,
			G: config.BackgroundGreen,
			B: config.BackgroundBlue,
			A: config.BackgroundAlpha,
		},
		// 关闭走 OnBeforeClose → Hide，以便同步可见性；真正退出由托盘 Quit 触发。
		HideWindowOnClose: false,
		OnStartup: func(ctx context.Context) {
			windowRuntime.SetContext(ctx)
			nativeFileService.SetContext(ctx)
			localDocumentService.SetContext(ctx)
			healthEmitter.SetContext(ctx)

			tray.SafeStart(trayRunner)

			if err := nativeFileService.SetToggleWindowHotkey(platform.SetToggleWindowHotkeyRequest{
				Accelerator: hotkey.DefaultToggleAccelerator(),
			}); err != nil {
				log.Printf("hotkey: unable to register default toggle shortcut: %v", err)
			}
		},
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			// REQ-030-AC-001 / AC-004：默认关闭隐藏；QuitApplication 放行退出。
			if nativeFileService.ShouldPreventClose() {
				_ = nativeFileService.HideMainWindow()
				return true
			}
			return false
		},
		OnShutdown: func(ctx context.Context) {
			trayRunner.Stop()
			_ = hotkeyManager.Close()
		},
		Windows: &windows.Options{
			WebviewUserDataPath: filepath.Join(defaultRootDir, "webview"),
		},
		Bind: []interface{}{
			localDocumentService,
			settingsService,
			secretService,
			nativeFileService,
			metadataService,
			aiService,
			healthService,
		},
	})
	if err != nil {
		log.Fatalf("Unable to start Linkit: %v", err)
	}
}

func selectTrayIcon() []byte {
	if runtime.GOOS == "windows" {
		return trayIconWindows
	}
	return trayIconPNG
}
