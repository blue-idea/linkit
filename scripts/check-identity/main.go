// 本机身份槽检查：对比 release /dev 路径，可选向 Dev 槽写入探针。
//
//	go run ./scripts/check-identity
//	go run -tags=dev ./scripts/check-identity -write-probe
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/settingsstore"
)

func main() {
	writeProbe := flag.Bool("write-probe", false, "Write a timestamp probe file into the current identity AppData root")
	flag.Parse()

	userConfig, err := os.UserConfigDir()
	if err != nil {
		fail("UserConfigDir: %v", err)
	}
	root := filepath.Join(userConfig, config.AppDataDirectoryName)

	fmt.Printf("profile=%s\n", config.AppIdentityProfile)
	fmt.Printf("title=%s\n", config.AppTitle)
	fmt.Printf("appData=%s\n", root)
	fmt.Printf("secretService=%s\n", config.SecretServiceName)
	fmt.Printf("exists=%t\n", dirExists(root))

	if !*writeProbe {
		return
	}
	if config.AppIdentityProfile != "dev" {
		fail("Refusing -write-probe outside -tags dev (profile=%s)", config.AppIdentityProfile)
	}
	if err := os.MkdirAll(root, 0o700); err != nil {
		fail("MkdirAll: %v", err)
	}
	probePath := filepath.Join(root, "identity-probe.txt")
	content := []byte(time.Now().UTC().Format(time.RFC3339Nano) + "\n")
	if err := os.WriteFile(probePath, content, 0o600); err != nil {
		fail("WriteFile: %v", err)
	}
	// 确认默认设置服务也指向同一开发槽，且不触碰正式槽。
	serviceRoot, err := settingsstore.DefaultRootDir()
	if err != nil {
		fail("settingsstore.DefaultRootDir: %v", err)
	}
	if filepath.Clean(serviceRoot) != filepath.Clean(root) {
		fail("settings root mismatch: service=%s identity=%s", serviceRoot, root)
	}
	fmt.Printf("probe=%s\n", probePath)
	fmt.Printf("settingsRoot=%s\n", serviceRoot)
	fmt.Println("write-probe=ok")
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
