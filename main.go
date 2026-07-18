package main

import (
	"context"
	"embed"
	"log"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/localstore"
	"github.com/blue-idea/collection/internal/metadata"
	"github.com/blue-idea/collection/internal/platform"
	"github.com/blue-idea/collection/internal/secretstore"
	"github.com/blue-idea/collection/internal/settingsstore"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// REQ-024-AC-001：Wails 构建会将 ui/dist 同步到此嵌入目录。
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	localDocumentService, err := localstore.NewDefaultService()
	if err != nil {
		log.Fatalf("Unable to initialise local document service: %v", err)
	}
	settingsService, err := settingsstore.NewDefaultService()
	if err != nil {
		log.Fatalf("Unable to initialise settings service: %v", err)
	}
	secretService, err := secretstore.NewDefaultService()
	if err != nil {
		log.Fatalf("Unable to initialise secret service: %v", err)
	}
	nativeFileService := platform.NewService()
	metadataService := metadata.NewService()

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
		},
		Bind: []interface{}{
			localDocumentService,
			settingsService,
			secretService,
			nativeFileService,
			metadataService,
		},
	})
	if err != nil {
		log.Fatalf("Unable to start Linkit: %v", err)
	}
}
