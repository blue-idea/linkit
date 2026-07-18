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

func TestAnalyzeBookmarkReturnsValidatedSuggestions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		raw, _ := io.ReadAll(request.Body)
		var body map[string]any
		_ = json.Unmarshal(raw, &body)
		if body["model"] != "test-model" {
			t.Errorf("Unexpected model: %#v", body["model"])
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"title\":\"AI Title\",\"summary\":\"AI summary\",\"suggestedCategoryId\":\"cat-1\",\"suggestedTags\":[\"react\",\"docs\"]}"}}]
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

	// REQ-006-AC-002：返回可编辑摘要、分类与标签建议；分类 ID 必须属于候选集。
	result, err := service.AnalyzeBookmark(AnalyzeBookmarkRequest{
		Context:     AIContext{APIBase: server.URL + "/v1", Model: "test-model", Locale: "en"},
		URL:         "https://example.test/page",
		Title:       "Original",
		ContentText: "Readable page content",
		CategoryCandidates: []IDName{
			{ID: "cat-1", Name: "Frontend"},
			{ID: "cat-2", Name: "Backend"},
		},
		TagCandidates: []IDLabel{
			{ID: "tag-1", Label: "react"},
		},
	})
	if err != nil {
		t.Fatalf("AnalyzeBookmark returned error: %v", err)
	}
	if result.Summary != "AI summary" {
		t.Fatalf("Unexpected summary: %+v", result)
	}
	if result.SuggestedCategoryID == nil || *result.SuggestedCategoryID != "cat-1" {
		t.Fatalf("Unexpected category: %+v", result.SuggestedCategoryID)
	}
	if len(result.SuggestedTags) != 2 || result.SuggestedTags[0] != "react" {
		t.Fatalf("Unexpected tags: %+v", result.SuggestedTags)
	}
	if result.Title != "AI Title" {
		t.Fatalf("Unexpected title: %+v", result)
	}
}

func TestAnalyzeBookmarkRejectsUnknownCategoryID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"summary\":\"x\",\"suggestedCategoryId\":\"cat-unknown\",\"suggestedTags\":[]}"}}]
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

	_, err := service.AnalyzeBookmark(AnalyzeBookmarkRequest{
		Context:            AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		URL:                "https://example.test",
		Title:              "T",
		ContentText:        "C",
		CategoryCandidates: []IDName{{ID: "cat-1", Name: "A"}},
	})
	assertCodedError(t, err, config.ErrorCodeAIResponseInvalid, true)
}

func TestAnalyzeBookmarkRequiresConsentBeforeNetwork(t *testing.T) {
	var hits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		writer.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(writer, `{"choices":[{"message":{"content":"{}"}}]}`)
	}))
	t.Cleanup(server.Close)

	service := NewService(
		WithCompleter(NewClient(
			WithHTTPClient(server.Client()),
			WithKeyLoader(stubKeyLoader{key: "sk-test"}),
			WithConsentChecker(&stubConsent{granted: false}),
		)),
	)

	_, err := service.AnalyzeBookmark(AnalyzeBookmarkRequest{
		Context:     AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		URL:         "https://example.test",
		Title:       "T",
		ContentText: "bookmark body",
	})
	assertCodedError(t, err, config.ErrorCodeAIConsentRequired, false)
	if hits.Load() != 0 {
		t.Fatalf("Consent failure must not hit network, hits=%d", hits.Load())
	}
}

func TestReanalyzeBookmarkReturnsPreviewWithoutSideEffects(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"summary\":\"New summary\",\"suggestedCategoryId\":null,\"suggestedTags\":[\"fresh\"]}"}}]
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

	// REQ-020-AC-001：Reanalyze 仅返回预览，不修改已保存值（Go 层无写入副作用）。
	result, err := service.ReanalyzeBookmark(AnalyzeBookmarkRequest{
		Context:     AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		URL:         "https://example.test",
		Title:       "Saved Title",
		ContentText: "Saved content",
	})
	if err != nil {
		t.Fatalf("ReanalyzeBookmark returned error: %v", err)
	}
	if result.Summary != "New summary" {
		t.Fatalf("Unexpected summary: %+v", result)
	}
	if result.SuggestedCategoryID != nil {
		t.Fatalf("Expected null category, got %+v", result.SuggestedCategoryID)
	}
	if len(result.SuggestedTags) != 1 || result.SuggestedTags[0] != "fresh" {
		t.Fatalf("Unexpected tags: %+v", result.SuggestedTags)
	}
}

func TestAnalyzeBookmarkMapsMissingKey(t *testing.T) {
	service := NewService(
		WithCompleter(NewClient(
			WithKeyLoader(stubKeyLoader{err: newServiceError(config.ErrorCodeSecretNotConfigured, config.ErrorMessageSecretNotConfigured, false, nil)}),
			WithConsentChecker(&stubConsent{granted: true}),
		)),
	)

	_, err := service.AnalyzeBookmark(AnalyzeBookmarkRequest{
		Context:     AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "en"},
		URL:         "https://example.test",
		Title:       "T",
		ContentText: "C",
	})
	assertCodedError(t, err, config.ErrorCodeSecretNotConfigured, false)
}
