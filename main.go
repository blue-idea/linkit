package main

import (
	"embed"
	"log"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/localstore"
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
		Bind: []interface{}{
			localDocumentService,
		},
	})
	if err != nil {
		log.Fatalf("Unable to start Linkit: %v", err)
	}
}
