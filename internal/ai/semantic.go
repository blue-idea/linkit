package ai

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"github.com/blue-idea/collection/config"
)

type SemanticCandidate struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Domain       string   `json:"domain"`
	Description  string   `json:"description"`
	NotesExcerpt string   `json:"notesExcerpt"`
	TagLabels    []string `json:"tagLabels"`
}

type SemanticSearchRequest struct {
	Context    AIContext           `json:"context"`
	Query      string              `json:"query"`
	Candidates []SemanticCandidate `json:"candidates"`
}

type SemanticHit struct {
	BookmarkID string  `json:"bookmarkId"`
	Score      float64 `json:"score"`
	Reason     string  `json:"reason"`
}

type SemanticSearchResult struct {
	Results []SemanticHit `json:"results"`
}

// RerankSemanticSearch 对本地候选做 AI 重排；结果 ID 必须属于候选集。
// REQ-018-AC-001
func (service *Service) RerankSemanticSearch(request SemanticSearchRequest) (SemanticSearchResult, error) {
	if service.completer == nil {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeAIRequestFailed, config.ErrorMessageAIRequestFailed, true, nil)
	}
	query := strings.TrimSpace(request.Query)
	if query == "" {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}
	if len(request.Candidates) == 0 {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}
	if strings.TrimSpace(request.Context.APIBase) == "" || strings.TrimSpace(request.Context.Model) == "" {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, nil)
	}

	limit := config.AIMaxSemanticCandidates
	candidates := request.Candidates
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	candidateIDs := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		candidateIDs[candidate.ID] = struct{}{}
	}

	system := `You are Linkit's semantic search reranker. Reply with a single JSON object only. Schema: {"results":[{"bookmarkId":"string","score":0.0,"reason":"string"}]}. bookmarkId must be one of the provided candidate ids. score must be a finite number between 0 and 1. Do not invent URLs or ids outside the candidate list. Do not wrap in markdown.`
	userPayload, err := json.Marshal(map[string]any{
		"query":      query,
		"candidates": candidates,
		"locale":     request.Context.Locale,
	})
	if err != nil {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeInvalidArgument, config.ErrorMessageAIInvalidArgument, false, err)
	}

	chatResult, err := service.completer.ChatCompletions(ChatRequest{
		Context:              request.Context,
		System:               system,
		User:                 string(userPayload),
		SendsBookmarkContent: true,
	})
	if err != nil {
		return SemanticSearchResult{}, err
	}

	return parseSemanticResult(chatResult.ContentJSON, candidateIDs)
}

func parseSemanticResult(raw json.RawMessage, candidateIDs map[string]struct{}) (SemanticSearchResult, error) {
	var dto struct {
		Results []struct {
			BookmarkID string  `json:"bookmarkId"`
			Score      float64 `json:"score"`
			Reason     string  `json:"reason"`
		} `json:"results"`
	}
	if err := json.Unmarshal(raw, &dto); err != nil {
		return SemanticSearchResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, err)
	}

	seen := make(map[string]struct{})
	hits := make([]SemanticHit, 0, len(dto.Results))
	for _, item := range dto.Results {
		id := strings.TrimSpace(item.BookmarkID)
		if id == "" {
			return SemanticSearchResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("empty bookmarkId"))
		}
		if _, ok := candidateIDs[id]; !ok {
			return SemanticSearchResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("bookmarkId not in candidates"))
		}
		if _, dup := seen[id]; dup {
			continue
		}
		if math.IsNaN(item.Score) || math.IsInf(item.Score, 0) || item.Score < 0 || item.Score > 1 {
			return SemanticSearchResult{}, newServiceError(config.ErrorCodeAIResponseInvalid, config.ErrorMessageAIResponseInvalid, true, fmt.Errorf("invalid score"))
		}
		seen[id] = struct{}{}
		hits = append(hits, SemanticHit{
			BookmarkID: id,
			Score:      item.Score,
			Reason:     strings.TrimSpace(item.Reason),
		})
	}

	return SemanticSearchResult{Results: hits}, nil
}
