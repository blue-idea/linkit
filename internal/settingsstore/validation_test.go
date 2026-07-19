package settingsstore

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/blue-idea/collection/config"
)

func TestValidateAppSettingsRejectsInvalidFields(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(*appSettings)
		wantErr bool
	}{
		{
			name: "非法 locale",
			mutate: func(settings *appSettings) {
				settings.Locale = "fr"
			},
			wantErr: true,
		},
		{
			name: "非法 storageMode",
			mutate: func(settings *appSettings) {
				settings.StorageMode = "hybrid"
			},
			wantErr: true,
		},
		{
			name: "非法 view mode",
			mutate: func(settings *appSettings) {
				settings.View.DefaultMode = "grid"
			},
			wantErr: true,
		},
		{
			name: "负 lastCloudRevision",
			mutate: func(settings *appSettings) {
				value := -1
				settings.LastCloudRev = &value
			},
			wantErr: true,
		},
		{
			name: "model 含首尾空白",
			mutate: func(settings *appSettings) {
				settings.AI.Model = " padded "
			},
			wantErr: true,
		},
		{
			name: "consent 缺少 grantedAt",
			mutate: func(settings *appSettings) {
				settings.AI.APIBase = "https://api.example.test/v1"
				settings.AIConsent = &aiConsent{APIBase: "https://api.example.test/v1", GrantedAt: ""}
			},
			wantErr: true,
		},
		{
			name: "合法 loopback AI Base",
			mutate: func(settings *appSettings) {
				settings.AI.APIBase = "http://localhost:11434/v1"
				settings.AI.Model = "local-model"
			},
			wantErr: false,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			settings := DefaultAppSettings()
			testCase.mutate(&settings)
			err := validateAppSettings(settings)
			if testCase.wantErr && err == nil {
				t.Fatal("Expected validation error")
			}
			if !testCase.wantErr && err != nil {
				t.Fatalf("Unexpected validation error: %v", err)
			}
		})
	}
}

func TestDecodeRejectsOversizedAndEmptyPayload(t *testing.T) {
	_, err := decodeAndValidateSettings(nil)
	assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)

	oversized := []byte("{" + strings.Repeat("a", int(config.MaxSettingsBytes)+8) + "}")
	_, err = decodeAndValidateSettings(oversized)
	assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)
}

func TestGetAIConsentStatusRejectsInvalidBase(t *testing.T) {
	service := NewService(t.TempDir())
	_, err := service.GetAIConsentStatus("not-a-url")
	assertCodedError(t, err, config.ErrorCodeSettingsInvalid, false)
}

// REQ-023-AC-003：Go 设置存储必须接受全部六套主题。
func TestDecodeAcceptsAllThemeValues(t *testing.T) {
	for _, theme := range []string{"midnight", "ocean", "graphite", "sunset", "daylight", "paper"} {
		t.Run(theme, func(t *testing.T) {
			payload := makeSettingsJSON(t, appSettings{
				SettingsVersion: 1,
				StorageMode:     "local",
				Theme:           theme,
				Locale:          "en",
				AI:              aiSettings{},
				View:            viewSettings{DefaultMode: "card"},
			})

			if _, err := decodeAndValidateSettings([]byte(payload)); err != nil {
				t.Fatalf("Theme %q must be accepted: %v", theme, err)
			}
		})
	}
}

func TestWriteSettingsRotatesBackupAcrossMultipleSaves(t *testing.T) {
	root := t.TempDir()
	service := NewService(root, WithClock(func() time.Time { return fixedTime }))

	for index, theme := range []string{"midnight", "ocean", "graphite"} {
		payload := makeSettingsJSON(t, appSettings{
			SettingsVersion: 1,
			StorageMode:     "local",
			Theme:           theme,
			Locale:          "en",
			AI:              aiSettings{},
			AIConsent:       nil,
			View:            viewSettings{DefaultMode: "card"},
			LastCloudRev:    nil,
		})
		if err := service.WriteSettings(SettingsWriteRequest{SettingsJSON: payload}); err != nil {
			t.Fatalf("WriteSettings #%d returned error: %v", index+1, err)
		}
	}

	result, err := service.ReadSettings()
	if err != nil {
		t.Fatalf("ReadSettings returned error: %v", err)
	}
	settings := decodeSettingsJSON(t, result.SettingsJSON)
	if settings.Theme != "graphite" {
		t.Fatalf("Unexpected theme after rotation: %q", settings.Theme)
	}
}

func TestServiceErrorUnwrap(t *testing.T) {
	cause := errors.New("root cause")
	err := newServiceError(config.ErrorCodeSettingsInvalid, config.ErrorMessageSettingsInvalid, false, cause)
	if !errors.Is(err, cause) {
		t.Fatalf("ServiceError must unwrap cause")
	}
}
