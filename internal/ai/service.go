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
	Description        string    `json:"description"`
	ContentText        string    `json:"contentText"`
	CategoryCandidates []IDName  `json:"categoryCandidates"`
	TagCandidates      []IDLabel `json:"tagCandidates"`
}

// AnalyzeBookmarkResult 对齐 REQ-006-AC-002 / TASK-033 DTO（含可编辑 title/description）。
type AnalyzeBookmarkResult struct {
	Title               string   `json:"title"`
	Description         string   `json:"description"`
	Summary             string   `json:"summary"`
	SuggestedCategoryID *string  `json:"suggestedCategoryId"`
	SuggestedTags       []string `json:"suggestedTags"`
}

type BookmarkCandidate struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	TagLabels   []string `json:"tagLabels"`
}

type GenerateCollectionRequest struct {
	Context            AIContext           `json:"context"`
	Goal               string              `json:"goal"`
	BookmarkCandidates []BookmarkCandidate `json:"bookmarkCandidates"`
}

type GenerateCollectionResult struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	SuggestedTags []string `json:"suggestedTags"`
	BookmarkIDs   []string `json:"bookmarkIds"`
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

// GenerateCollection 仅生成可编辑预览，不持有资料库写入能力。
func (service *Service) GenerateCollection(request GenerateCollectionRequest) (GenerateCollectionResult, error) {
	if service.completer == nil || strings.TrimSpace(request.Goal) == "" ||
		strings.TrimSpace(request.Context.APIBase) == "" || strings.TrimSpace(request.Context.Model) == "" {
		return GenerateCollectionResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}

	payload, err := json.Marshal(map[string]any{
		"goal":               request.Goal,
		"bookmarkCandidates": request.BookmarkCandidates,
		"locale":             request.Context.Locale,
	})
	if err != nil {
		return GenerateCollectionResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, err)
	}
	result, err := service.completer.ChatCompletions(ChatRequest{
		Context: request.Context,
		System:  `You are Linkit's collection planner. Reply with one JSON object only. Schema: {"name":"string","description":"string","suggestedTags":["string"],"bookmarkIds":["string"]}. bookmarkIds must only use provided candidate ids. Do not wrap in markdown.`,
		User:    string(payload), SendsBookmarkContent: true,
	})
	if err != nil {
		return GenerateCollectionResult{}, err
	}
	return parseGenerateCollectionResult(result.ContentJSON, request.BookmarkCandidates)
}

func parseGenerateCollectionResult(raw json.RawMessage, candidates []BookmarkCandidate) (GenerateCollectionResult, error) {
	var result GenerateCollectionResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return GenerateCollectionResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	result.Name = strings.TrimSpace(result.Name)
	result.Description = strings.TrimSpace(result.Description)
	if result.Name == "" {
		return GenerateCollectionResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("name is required"))
	}
	allowed := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		allowed[candidate.ID] = struct{}{}
	}
	seen := make(map[string]struct{}, len(result.BookmarkIDs))
	ids := make([]string, 0, len(result.BookmarkIDs))
	for _, id := range result.BookmarkIDs {
		if _, ok := allowed[id]; !ok {
			return GenerateCollectionResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("bookmarkId is not in candidates"))
		}
		if _, duplicate := seen[id]; duplicate {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	result.BookmarkIDs = ids
	return result, nil
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

	system := buildAnalyzeBookmarkSystemPrompt(request.Context.Locale)
	userPayload, err := json.Marshal(map[string]any{
		"url":                request.URL,
		"title":              request.Title,
		"description":        request.Description,
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
	Description         string          `json:"description"`
	Summary             string          `json:"summary"`
	SuggestedCategoryID json.RawMessage `json:"suggestedCategoryId"`
	SuggestedTags       []string        `json:"suggestedTags"`
}

func parseAnalyzeResult(raw json.RawMessage, categories []IDName) (AnalyzeBookmarkResult, error) {
	var dto analyzeDTO
	if err := json.Unmarshal(raw, &dto); err != nil {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}
	summary := strings.TrimSpace(dto.Summary)
	if summary == "" {
		return AnalyzeBookmarkResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("summary is required"))
	}
	summary = truncateRunes(summary, config.AISummaryMaxRunes)

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
		Description:         strings.TrimSpace(dto.Description),
		Summary:             summary,
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
