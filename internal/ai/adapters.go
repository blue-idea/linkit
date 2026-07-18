package ai

import (
	"github.com/blue-idea/collection/config"
	"github.com/blue-idea/collection/internal/secretstore"
	"github.com/blue-idea/collection/internal/settingsstore"
)

// SecretKeyLoader 将 SecretStore 适配为 AI KeyLoader。
type SecretKeyLoader struct {
	Secrets *secretstore.Service
}

func (loader SecretKeyLoader) LoadAIKey() (string, error) {
	if loader.Secrets == nil {
		return "", newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, nil)
	}
	return loader.Secrets.LoadAIKey()
}

// SettingsConsentChecker 在发送前二次读取本机 AI 授权状态。
type SettingsConsentChecker struct {
	Settings *settingsstore.Service
}

func (checker SettingsConsentChecker) HasConsent(apiBase string) (bool, error) {
	if checker.Settings == nil {
		return false, newServiceError(config.ErrorCodeAIConsentRequired, config.ErrorMessageAIConsentRequired, false, nil)
	}
	status, err := checker.Settings.GetAIConsentStatus(apiBase)
	if err != nil {
		return false, err
	}
	return status.Granted, nil
}
