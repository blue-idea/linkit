package secretstore

import "github.com/blue-idea/collection/config"

// Backend 抽象 OS Keychain / 内存替身。
type Backend interface {
	Set(service, key, value string) error
	Get(service, key string) (string, error)
	Delete(service, key string) error
}

type SetSecretRequest struct {
	Value string `json:"value"`
}

type SecretStatus struct {
	Configured bool `json:"configured"`
}

type Service struct {
	backend Backend
	service string
	key     string
}

func NewService(backend Backend) *Service {
	return &Service{
		backend: backend,
		service: config.SecretServiceName,
		key:     config.AIAPIKeySecretKey,
	}
}

func NewDefaultService() (*Service, error) {
	return NewService(NewKeyringBackend()), nil
}

func (service *Service) SetAIKey(request SetSecretRequest) error {
	value := trimSpace(request.Value)
	if value == "" {
		return newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageSecretEmpty, false, nil)
	}
	if err := service.backend.Set(service.service, service.key, value); err != nil {
		return newServiceError(config.ErrorCodeSecretWriteFailed, config.ErrorMessageSecretWriteFailed, true, err)
	}
	return nil
}

func (service *Service) DeleteAIKey() error {
	if err := service.backend.Delete(service.service, service.key); err != nil {
		// 删除缺失项视为成功，避免前端重复删除失败。
		if isNotFound(err) {
			return nil
		}
		return newServiceError(config.ErrorCodeSecretWriteFailed, config.ErrorMessageSecretWriteFailed, true, err)
	}
	return nil
}

func (service *Service) GetAIKeyStatus() (SecretStatus, error) {
	_, err := service.backend.Get(service.service, service.key)
	if err != nil {
		if isNotFound(err) {
			return SecretStatus{Configured: false}, nil
		}
		return SecretStatus{}, newServiceError(config.ErrorCodeSecretReadFailed, config.ErrorMessageSecretReadFailed, true, err)
	}
	return SecretStatus{Configured: true}, nil
}

// LoadAIKey 仅供 Go 侧 AI 适配器读取；Wails 绑定契约不暴露明文返回方法给前端业务层使用。
// 注意：若将整个 Service 绑定到 Wails，仍可能反射到此方法——前端仓库规范禁止调用。
func (service *Service) LoadAIKey() (string, error) {
	value, err := service.backend.Get(service.service, service.key)
	if err != nil {
		if isNotFound(err) {
			return "", newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, err)
		}
		return "", newServiceError(config.ErrorCodeSecretReadFailed, config.ErrorMessageSecretReadFailed, true, err)
	}
	return value, nil
}

func trimSpace(value string) string {
	start, end := 0, len(value)
	for start < end && (value[start] == ' ' || value[start] == '\t' || value[start] == '\n' || value[start] == '\r') {
		start++
	}
	for end > start && (value[end-1] == ' ' || value[end-1] == '\t' || value[end-1] == '\n' || value[end-1] == '\r') {
		end--
	}
	return value[start:end]
}
