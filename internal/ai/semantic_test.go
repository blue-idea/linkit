package ai

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/blue-idea/collection/config"
)

func TestRerankSemanticSearchReturnsOnlyCandidateIDs(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		raw, _ := io.ReadAll(request.Body)
		var body map[string]any
		_ = json.Unmarshal(raw, &body)
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"results\":[{\"bookmarkId\":\"b-1\",\"score\":0.91,\"reason\":\"color tools\"},{\"bookmarkId\":\"b-2\",\"score\":0.7,\"reason\":\"related\"}]}"}}]
		}`)
	}))
	t.Cleanup(server.Close)

	service := NewService(
		WithCompleter(NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithConsentChecker(&stubConsent{granted: true}),
		)),
	)

	// REQ-018-AC-001：结果仅来自库内候选，score 为有效数值。
	result, err := service.RerankSemanticSearch(SemanticSearchRequest{
		Context: AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		Query:   "color palette tools",
		Candidates: []SemanticCandidate{
			{ID: "b-1", Title: "Coolors", Domain: "coolors.co", Description: "palette", NotesExcerpt: "", TagLabels: []string{"color"}},
			{ID: "b-2", Title: "Awwwards", Domain: "awwwards.com", Description: "design", NotesExcerpt: "", TagLabels: []string{"design"}},
		},
	})
	if err != nil {
		t.Fatalf("RerankSemanticSearch returned error: %v", err)
	}
	if len(result.Results) != 2 {
		t.Fatalf("Unexpected results: %+v", result.Results)
	}
	if result.Results[0].BookmarkID != "b-1" || result.Results[0].Score < 0.9 {
		t.Fatalf("Unexpected first result: %+v", result.Results[0])
	}
}

func TestRerankSemanticSearchRejectsExternalIDsAndInvalidScores(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"results\":[{\"bookmarkId\":\"external-url\",\"score\":1.5,\"reason\":\"web\"}]}"}}]
		}`)
	}))
	t.Cleanup(server.Close)

	service := NewService(
		WithCompleter(NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithConsentChecker(&stubConsent{granted: true}),
		)),
	)

	_, err := service.RerankSemanticSearch(SemanticSearchRequest{
		Context: AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		Query:   "anything",
		Candidates: []SemanticCandidate{
			{ID: "b-1", Title: "Local", Domain: "example.test", Description: "", NotesExcerpt: "", TagLabels: nil},
		},
	})
	assertCodedError(t, err, config.ErrorCodeAIResponseInvalid, true)
}

func TestRerankSemanticSearchRequiresConsent(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	service := NewService(
		WithCompleter(NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithConsentChecker(&stubConsent{granted: false}),
		)),
	)

	_, err := service.RerankSemanticSearch(SemanticSearchRequest{
		Context:    AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		Query:      "q",
		Candidates: []SemanticCandidate{{ID: "b-1", Title: "T", Domain: "d", Description: "", NotesExcerpt: "", TagLabels: nil}},
	})
	assertCodedError(t, err, config.ErrorCodeAIConsentRequired, false)
	if hits.Load() != 0 {
		t.Fatalf("Consent failure must not hit network, hits=%d", hits.Load())
	}
}

func TestRerankSemanticSearchRejectsEmptyQueryOrCandidates(t *testing.T) {
	service := NewService(WithCompleter(NewClient(
		WithKeyLoader(stubKeyLoader{key: "sk"}),
		WithConsentChecker(&stubConsent{granted: true}),
	)))

	_, err := service.RerankSemanticSearch(SemanticSearchRequest{
		Context:    AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "en"},
		Query:      "   ",
		Candidates: []SemanticCandidate{{ID: "b-1", Title: "T", Domain: "d", Description: "", NotesExcerpt: "", TagLabels: nil}},
	})
	assertCodedError(t, err, config.ErrorCodeInvalidArgument, false)

	_, err = service.RerankSemanticSearch(SemanticSearchRequest{
		Context:    AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "en"},
		Query:      "ok",
		Candidates: nil,
	})
	assertCodedError(t, err, config.ErrorCodeInvalidArgument, false)
}
