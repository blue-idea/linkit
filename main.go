package main

import (
	"context"
	"embed"
	"log"
	"path/filepath"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/ai"
	"github.com/blue-idea/collection/internal/health"
	"github.com/blue-idea/collection/internal/localstore"
	"github.com/blue-idea/collection/internal/metadata"
	"github.com/blue-idea/collection/internal/platform"
	"github.com/blue-idea/collection/internal/secretstore"
	"github.com/blue-idea/collection/internal/settingsstore"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

// REQ-024-AC-001：Wails 构建会将 ui/dist 同步到此嵌入目录。
//
//go:embed all:frontend/dist
var assets embed.FS

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
	nativeFileService := platform.NewService()
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
		OnStartup: func(ctx context.Context) {
			// 原生对话框依赖 Wails 运行时上下文。
			nativeFileService.SetContext(ctx)
			localDocumentService.SetContext(ctx)
			healthEmitter.SetContext(ctx)
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
