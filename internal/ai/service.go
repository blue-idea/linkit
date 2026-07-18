package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/blue-idea/collection/config"
)

// Completer 抽象 Chat Completions，便于服务层注入测试替身。
type Completer interface {
	ChatCompletions(request ChatRequest) (ChatResult, error)
}

type IDName struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type IDLabel struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type AnalyzeBookmarkRequest struct {
	Context            AIContext `json:"context"`
	URL                string    `json:"url"`
	Title              string    `json:"title"`
	ContentText        string    `json:"contentText"`
	CategoryCandidates []IDName  `json:"categoryCandidates"`
	TagCandidates      []IDLabel `json:"tagCandidates"`
}

// AnalyzeBookmarkResult 对齐 REQ-006-AC-002 / TASK-033 DTO（含可编辑 title）。
type AnalyzeBookmarkResult struct {
	Title                string   `json:"title"`
	Summary              string   `json:"summary"`
	SuggestedCategoryID  *string  `json:"suggestedCategoryId"`
	SuggestedTags        []string `json:"suggestedTags"`
}

type Service struct {
	completer Completer
}

type ServiceOption func(*Service)

func NewService(options ...ServiceOption) *Service {
	service := &Service{}
	for _, option := range options {
		option(service)
	}
	return service
}

func WithCompleter(completer Completer) ServiceOption {
	return func(service *Service) {
		service.completer = completer
	}
}

// NewDefaultService 组装生产用 SecretStore + Settings consent 检查的客户端。
func NewDefaultService(keyLoader KeyLoader, consentChecker ConsentChecker) *Service {
	return NewService(
		WithCompleter(NewClient(
			WithKeyLoader(keyLoader),
			WithConsentChecker(consentChecker),
		)),
	)
}

func (service *Service) AnalyzeBookmark(request AnalyzeBookmarkRequest) (AnalyzeBookmarkResult, error) {
	return service.analyze(request)
}

// ReanalyzeBookmark 契约与 Analyze 相同，仅返回预览，不得写入资料库。
func (service *Service) ReanalyzeBookmark(request AnalyzeBookmarkRequest) (AnalyzeBookmarkResult, error) {
	return service.analyze(request)
}

func (service *Service) analyze(request AnalyzeBookmarkRequest) (AnalyzeBookmarkResult, error) {
	if service.completer == nil {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, true, nil)
	}
	if strings.TrimSpace(request.URL) == "" {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}
	if strings.TrimSpace(request.Context.APIBase) == "" || strings.TrimSpace(request.Context.Model) == "" {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}

	system := `You are Linkit's bookmark analyzer. Reply with a single JSON object only. Schema: {"title":"string","summary":"string","suggestedCategoryId":"string|null","suggestedTags":["string"]}. suggestedCategoryId must be one of the provided category candidate ids or null. suggestedTags are short label strings. Do not wrap in markdown.`
	userPayload, err := json.Marshal(map[string]any{
		"url":                request.URL,
		"title":              request.Title,
		"contentText":        truncateRunes(request.ContentText, 6000),
		"categoryCandidates": request.CategoryCandidates,
		"tagCandidates":      request.TagCandidates,
		"locale":             request.Context.Locale,
	})
	if err != nil {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, err)
	}

	chatResult, err := service.completer.ChatCompletions(ChatRequest{
		Context:              request.Context,
		System:               system,
		User:                 string(userPayload),
		SendsBookmarkContent: true,
	})
	if err != nil {
		return AnalyzeBookmarkResult{}, err
	}

	return parseAnalyzeResult(chatResult.ContentJSON, request.CategoryCandidates)
}

type analyzeDTO struct {
	Title               string          `json:"title"`
	Summary             string          `json:"summary"`
	SuggestedCategoryID json.RawMessage `json:"suggestedCategoryId"`
	SuggestedTags       []string        `json:"suggestedTags"`
}

func parseAnalyzeResult(raw json.RawMessage, categories []IDName) (AnalyzeBookmarkResult, error) {
	var dto analyzeDTO
	if err := json.Unmarshal(raw, &dto); err != nil {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	if strings.TrimSpace(dto.Summary) == "" {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("summary is required"))
	}

	categoryID, err := parseOptionalCategoryID(dto.SuggestedCategoryID, categories)
	if err != nil {
		return AnalyzeBookmarkResult{}, err
	}

	tags := make([]string, 0, len(dto.SuggestedTags))
	for _, tag := range dto.SuggestedTags {
		label := strings.TrimSpace(tag)
		if label == "" {
			continue
		}
		if len([]rune(label)) > 64 {
			return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("tag too long"))
		}
		tags = append(tags, label)
	}

	title := strings.TrimSpace(dto.Title)
	return AnalyzeBookmarkResult{
		Title:               title,
		Summary:             strings.TrimSpace(dto.Summary),
		SuggestedCategoryID: categoryID,
		SuggestedTags:       tags,
	}, nil
}

func parseOptionalCategoryID(raw json.RawMessage, categories []IDName) (*string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var id string
	if err := json.Unmarshal(raw, &id); err != nil {
		return nil, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, nil
	}
	for _, candidate := range categories {
		if candidate.ID == id {
			return &id, nil
		}
	}
	return nil, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("suggestedCategoryId is not in candidates"))
}

func truncateRunes(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}
