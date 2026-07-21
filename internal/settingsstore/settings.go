package settingsstore

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/blue-idea/collection/config"
)

type appSettings struct {
	SettingsVersion int               `json:"settingsVersion"`
	StorageMode     string            `json:"storageMode"`
	Theme           string            `json:"theme"`
	Locale          string            `json:"locale"`
	AI              aiSettings        `json:"ai"`
	AIConsent       *aiConsent        `json:"aiConsent"`
	View            viewSettings      `json:"view"`
	LastCloudRev    *int              `json:"lastCloudRevision"`
	Shortcuts       map[string]string `json:"shortcuts"`
}

type aiSettings struct {
	APIBase string `json:"apiBase"`
	Model   string `json:"model"`
}

type aiConsent struct {
	APIBase   string `json:"apiBase"`
	GrantedAt string `json:"grantedAt"`
}

type viewSettings struct {
	DefaultMode string `json:"defaultMode"`
}

var allowedThemes = map[string]struct{}{
	"midnight": {},
	"ocean":    {},
	"graphite": {},
	"sunset":   {},
	"daylight": {},
	"paper":    {},
}

var allowedLocales = map[string]struct{}{
	"en": {},
	"zh": {},
}

var allowedStorageModes = map[string]struct{}{
	"local": {},
	"cloud": {},
}

var allowedViewModes = map[string]struct{}{
	"card":            {},
	"list":            {},
	"masonry":         {},
	"timeline":        {},
	"tag-aggregation": {},
	"theme-space":     {},
}

// DefaultAppSettings 返回首次启动使用的正式默认值（locale=en，AI 未配置）。
func DefaultAppSettings() appSettings {
	return appSettings{
		SettingsVersion: 1,
		StorageMode:     "local",
		Theme:           "midnight",
		Locale:          "en",
		AI:              aiSettings{APIBase: "", Model: ""},
		AIConsent:       nil,
		View:            viewSettings{DefaultMode: "card"},
		LastCloudRev:    nil,
		Shortcuts: map[string]string{
			"spotlight":     "CmdOrCtrl+K",
			"newBookmark":   "CmdOrCtrl+N",
			"insights":      "CmdOrCtrl+I",
			"settings":      "CmdOrCtrl+,",
			"viewCard":      "CmdOrCtrl+1",
			"viewList":      "CmdOrCtrl+2",
			"viewMasonry":   "CmdOrCtrl+3",
			"toggleSidebar": "CmdOrCtrl+\\",
			"toggleWindow":  "CmdOrCtrl+L",
		},
	}
}

func defaultSettingsJSON() (string, error) {
	content, err := json.Marshal(DefaultAppSettings())
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func decodeAndValidateSettings(content []byte) (appSettings, error) {
	if len(content) == 0 || int64(len(content)) > config.MaxSettingsBytes {
		return appSettings{}, invalidSettingsError(fmt.Errorf("settings size %d is out of range", len(content)))
	}
	if !json.Valid(content) {
		return appSettings{}, invalidSettingsError(nil)
	}

	// 禁止未知字段，尤其是 apiKey，避免密钥落入 settings.json。
	decoder := json.NewDecoder(bytes.NewReader(content))
	decoder.DisallowUnknownFields()
	var settings appSettings
	if err := decoder.Decode(&settings); err != nil {
		return appSettings{}, invalidSettingsError(err)
	}
	if err := validateAppSettings(settings); err != nil {
		return appSettings{}, err
	}
	return settings, nil
}

func validateAppSettings(settings appSettings) error {
	if settings.SettingsVersion < 1 {
		return invalidSettingsError(fmt.Errorf("unsupported settingsVersion"))
	}
	if _, ok := allowedStorageModes[settings.StorageMode]; !ok {
		return invalidSettingsError(fmt.Errorf("invalid storageMode"))
	}
	if _, ok := allowedThemes[settings.Theme]; !ok {
		return invalidSettingsError(fmt.Errorf("invalid theme"))
	}
	if _, ok := allowedLocales[settings.Locale]; !ok {
		return invalidSettingsError(fmt.Errorf("invalid locale"))
	}
	if _, ok := allowedViewModes[settings.View.DefaultMode]; !ok {
		return invalidSettingsError(fmt.Errorf("invalid view.defaultMode"))
	}
	if settings.LastCloudRev != nil && *settings.LastCloudRev < 0 {
		return invalidSettingsError(fmt.Errorf("invalid lastCloudRevision"))
	}
	if err := validateAPIBase(settings.AI.APIBase, true); err != nil {
		return err
	}
	if strings.TrimSpace(settings.AI.Model) != settings.AI.Model {
		return invalidSettingsError(fmt.Errorf("model must be trimmed"))
	}
	if settings.AIConsent != nil {
		if err := validateAPIBase(settings.AIConsent.APIBase, false); err != nil {
			return err
		}
		if strings.TrimSpace(settings.AIConsent.GrantedAt) == "" {
			return invalidSettingsError(fmt.Errorf("consent grantedAt is required"))
		}
	}
	return nil
}

func validateAPIBase(raw string, allowEmpty bool) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		if allowEmpty {
			return nil
		}
		return invalidSettingsError(fmt.Errorf("apiBase is required"))
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return invalidSettingsError(fmt.Errorf("apiBase is not a valid URL"))
	}
	host := strings.ToLower(parsed.Hostname())
	isLoopback := host == "localhost" || host == "127.0.0.1" || host == "::1"
	if parsed.Scheme == "https" {
		return nil
	}
	if parsed.Scheme == "http" && isLoopback {
		return nil
	}
	return invalidSettingsError(fmt.Errorf("apiBase must use HTTPS unless it targets loopback"))
}

// normalizeAPIBase 统一去掉尾随斜杠，供授权匹配使用。
func normalizeAPIBase(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	return strings.TrimRight(trimmed, "/")
}

func consentMatches(settings appSettings, apiBase string) bool {
	if settings.AIConsent == nil {
		return false
	}
	return normalizeAPIBase(settings.AIConsent.APIBase) == normalizeAPIBase(apiBase) &&
		normalizeAPIBase(settings.AI.APIBase) == normalizeAPIBase(apiBase)
}

func clearMismatchedConsent(settings *appSettings) {
	if settings.AIConsent == nil {
		return
	}
	if normalizeAPIBase(settings.AIConsent.APIBase) != normalizeAPIBase(settings.AI.APIBase) {
		settings.AIConsent = nil
	}
}

func encodeSettings(settings appSettings) (string, error) {
	content, err := json.Marshal(settings)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func invalidSettingsError(cause error) error {
	return newServiceError(config.ErrorCodeSettingsInvalid, config.ErrorMessageSettingsInvalid, false, cause)
}
