package scaffold_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const (
	expectedModulePath   = "github.com/blue-idea/collection"
	expectedWailsVersion = "v2.13.0"
	expectedPnpmVersion  = "10.33.0"
)

type wailsConfig struct {
	Schema             string `json:"$schema"`
	Name               string `json:"name"`
	OutputFilename     string `json:"outputfilename"`
	FrontendDir        string `json:"frontend:dir"`
	FrontendInstall    string `json:"frontend:install"`
	FrontendBuild      string `json:"frontend:build"`
	FrontendDevWatcher string `json:"frontend:dev:watcher"`
	FrontendDevURL     string `json:"frontend:dev:serverUrl"`
	WailsJSDir         string `json:"wailsjsdir"`
}

type packageConfig struct {
	PackageManager string            `json:"packageManager"`
	Scripts        map[string]string `json:"scripts"`
}

func TestProjectSkeleton(t *testing.T) {
	repositoryRoot := findRepositoryRoot(t)

	// REQ-024-AC-001：桌面主窗口必须由可构建的 Wails 根工程承载。
	t.Run("Wails 配置指向现有 ui 前端并统一使用 pnpm", func(t *testing.T) {
		var config wailsConfig
		readJSON(t, filepath.Join(repositoryRoot, "wails.json"), &config)

		expected := wailsConfig{
			Schema:             "https://wails.io/schemas/config.v2.json",
			Name:               "Linkit",
			OutputFilename:     "linkit",
			FrontendDir:        "ui",
			FrontendInstall:    "pnpm install --frozen-lockfile",
			FrontendBuild:      "pnpm build",
			FrontendDevWatcher: "pnpm dev",
			FrontendDevURL:     "auto",
			WailsJSDir:         "ui",
		}

		if config != expected {
			t.Fatalf("Wails config mismatch: got %+v, want %+v", config, expected)
		}
	})

	// REQ-027-AC-001：跨平台桌面运行时必须锁定稳定的 Wails v2 版本。
	t.Run("Go module 锁定项目路径与 Wails 稳定版本", func(t *testing.T) {
		goMod := readFile(t, filepath.Join(repositoryRoot, "go.mod"))

		assertContains(t, goMod, "module "+expectedModulePath)
		assertContains(t, goMod, "go 1.26")
		assertContains(t, goMod, "github.com/wailsapp/wails/v2 "+expectedWailsVersion)
	})

	// REQ-024-AC-001：Wails 入口必须嵌入构建后的 UI，并从集中配置装配窗口。
	t.Run("Wails 入口嵌入前端产物并使用集中配置", func(t *testing.T) {
		mainSource := readFile(t, filepath.Join(repositoryRoot, "main.go"))

		assertContains(t, mainSource, "//go:embed all:frontend/dist")
		assertContains(t, mainSource, expectedModulePath+"/config")
		assertPathExists(t, filepath.Join(repositoryRoot, "config", "app.go"))
		assertPathExists(t, filepath.Join(repositoryRoot, "frontend", "dist", ".gitkeep"))
	})

	// REQ-027-AC-001：统一包管理器与锁文件保证跨平台构建输入一致。
	t.Run("前端只保留 pnpm 锁文件并锁定工具版本", func(t *testing.T) {
		var config packageConfig
		readJSON(t, filepath.Join(repositoryRoot, "ui", "package.json"), &config)

		if config.PackageManager != "pnpm@"+expectedPnpmVersion {
			t.Fatalf("Unexpected packageManager: got %q", config.PackageManager)
		}

		for _, script := range []string{"dev", "build", "lint", "typecheck"} {
			if strings.TrimSpace(config.Scripts[script]) == "" {
				t.Fatalf("Missing package script: %s", script)
			}
		}

		assertPathExists(t, filepath.Join(repositoryRoot, "ui", "pnpm-lock.yaml"))
		assertPathMissing(t, filepath.Join(repositoryRoot, "ui", "package-lock.json"))
		assertPathMissing(t, filepath.Join(repositoryRoot, "ui", "yarn.lock"))
	})
}

func findRepositoryRoot(t *testing.T) string {
	t.Helper()

	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("Unable to resolve test file path")
	}

	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", ".."))
}

func readJSON(t *testing.T, path string, target any) {
	t.Helper()

	content := readFile(t, path)
	if err := json.Unmarshal([]byte(content), target); err != nil {
		t.Fatalf("Unable to decode JSON file %s: %v", path, err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Unable to read file %s: %v", path, err)
	}

	return string(content)
}

func assertContains(t *testing.T, content string, expected string) {
	t.Helper()

	if !strings.Contains(content, expected) {
		t.Fatalf("Expected content to include %q", expected)
	}
}

func assertPathExists(t *testing.T, path string) {
	t.Helper()

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("Expected path to exist %s: %v", path, err)
	}
}

func assertPathMissing(t *testing.T, path string) {
	t.Helper()

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("Expected path to be absent: %s", path)
	}
}
