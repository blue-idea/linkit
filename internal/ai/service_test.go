package ai

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/blue-idea/collection/config"
)

type stubCompleter struct{ content json.RawMessage }

func (stub stubCompleter) ChatCompletions(ChatRequest) (ChatResult, error) {
	return ChatResult{ContentJSON: stub.content}, nil
}

type capturingCompleter struct {
	last    ChatRequest
	content json.RawMessage
}

func (c *capturingCompleter) ChatCompletions(request ChatRequest) (ChatResult, error) {
	c.last = request
	return ChatResult{ContentJSON: c.content}, nil
}

func TestAnalyzeBookmarkSystemPromptFollowsSettingsLocale(t *testing.T) {
	validJSON := json.RawMessage(`{"title":"T","description":"D","summary":"S","suggestedCategoryId":null,"suggestedTags":["tag"]}`)

	t.Run("en 生成指令要求英文", func(t *testing.T) {
		capture := &capturingCompleter{content: validJSON}
		service := NewService(WithCompleter(capture))
		_, err := service.AnalyzeBookmark(AnalyzeBookmarkRequest{
			Context:     AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "en"},
			URL:         "https://example.test",
			Title:       "Title",
			Description: "Source desc",
			ContentText: "Body",
		})
		if err != nil {
			t.Fatalf("AnalyzeBookmark returned error: %v", err)
		}
		if !strings.Contains(capture.last.System, "description") || !strings.Contains(capture.last.System, "entirely in English") {
			t.Fatalf("Expected English language rule covering description, got: %s", capture.last.System)
		}
		if !strings.Contains(capture.last.User, `"locale":"en"`) || !strings.Contains(capture.last.User, `"description":"Source desc"`) {
			t.Fatalf("Expected locale/description in user payload, got: %s", capture.last.User)
		}
	})

	t.Run("zh 生成指令要求简体中文", func(t *testing.T) {
		capture := &capturingCompleter{content: validJSON}
		service := NewService(WithCompleter(capture))
		// Reanalyze 与 Analyze 共用 prompt，一并覆盖。
		_, err := service.ReanalyzeBookmark(AnalyzeBookmarkRequest{
			Context:     AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "zh"},
			URL:         "https://example.test",
			Title:       "标题",
			Description: "源描述",
			ContentText: "正文",
		})
		if err != nil {
			t.Fatalf("ReanalyzeBookmark returned error: %v", err)
		}
		if !strings.Contains(capture.last.System, "description") || !strings.Contains(capture.last.System, "Simplified Chinese") {
			t.Fatalf("Expected Simplified Chinese language rule covering description, got: %s", capture.last.System)
		}
		if !strings.Contains(capture.last.User, `"locale":"zh"`) {
			t.Fatalf("Expected locale=zh in user payload, got: %s", capture.last.User)
		}
	})
}

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
			"choices":[{"message":{"content":"{\"title\":\"AI Title\",\"description\":\"AI description\",\"summary\":\"AI summary\",\"suggestedCategoryId\":\"cat-1\",\"suggestedTags\":[\"react\",\"docs\"]}"}}]
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
	if result.Description != "AI description" {
		t.Fatalf("Unexpected description: %+v", result)
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

func TestGenerateCollectionReturnsOnlyLibraryCandidateIDs(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{
			"choices":[{"message":{"content":"{\"name\":\"Frontend Research\",\"description\":\"A focused reading list\",\"suggestedTags\":[\"frontend\",\"research\"],\"bookmarkIds\":[\"bookmark-1\",\"bookmark-2\"]}"}}]
		}`)
	}))
	t.Cleanup(server.Close)

	service := NewService(WithCompleter(NewClient(
		WithHTTPClient(server.Client()),
		WithKeyLoader(stubKeyLoader{key: "sk-test"}),
		WithConsentChecker(&stubConsent{granted: true}),
	)))

	// REQ-013-AC-003：AI 主题仅返回资料库候选成员，且不写入资料库。
	result, err := service.GenerateCollection(GenerateCollectionRequest{
		Context: AIContext{APIBase: server.URL + "/v1", Model: "m", Locale: "en"},
		Goal:    "Build a frontend research collection",
		BookmarkCandidates: []BookmarkCandidate{
			{ID: "bookmark-1", Title: "React", Description: "React docs", TagLabels: []string{"frontend"}},
			{ID: "bookmark-2", Title: "CSS", Description: "CSS guide", TagLabels: []string{"frontend"}},
		},
	})
	if err != nil {
		t.Fatalf("GenerateCollection returned error: %v", err)
	}
	if result.Name != "Frontend Research" || len(result.BookmarkIDs) != 2 {
		t.Fatalf("Unexpected collection preview: %+v", result)
	}
}

func TestGenerateCollectionRejectsUnknownBookmarkID(t *testing.T) {
	service := NewService(WithCompleter(stubCompleter{content: json.RawMessage(`{
		"name":"Unsafe","description":"x","suggestedTags":[],"bookmarkIds":["bookmark-outside-library"]
	}`)}))

	_, err := service.GenerateCollection(GenerateCollectionRequest{
		Context:            AIContext{APIBase: "https://api.example.test/v1", Model: "m", Locale: "en"},
		Goal:               "Find related bookmarks",
		BookmarkCandidates: []BookmarkCandidate{{ID: "bookmark-1", Title: "React"}},
	})
	assertCodedError(t, err, config.ErrorCodeAIResponseInvalid, true)
}
