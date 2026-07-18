package ai

import "testing"

func TestNormalizeAPIBaseTrimsTrailingSlashes(t *testing.T) {
	// REQ-019-AC-002：API Base 规范化后用于拼装 Chat Completions URL。
	cases := []struct {
		raw  string
		want string
	}{
		{"https://api.example.test/v1/", "https://api.example.test/v1"},
		{" https://api.example.test/v1 ", "https://api.example.test/v1"},
		{"https://api.example.test/v1///", "https://api.example.test/v1"},
		{"", ""},
	}
	for _, tc := range cases {
		got := NormalizeAPIBase(tc.raw)
		if got != tc.want {
			t.Fatalf("NormalizeAPIBase(%q)=%q, want %q", tc.raw, got, tc.want)
		}
	}
}

func TestChatCompletionsURLDoesNotDuplicateV1(t *testing.T) {
	// api.md §5.1：若 Base 已含 /v1，不得重复拼接。
	cases := []struct {
		raw  string
		want string
	}{
		{"https://api.example.test/v1", "https://api.example.test/v1/chat/completions"},
		{"https://api.example.test/v1/", "https://api.example.test/v1/chat/completions"},
		{"https://api.example.test", "https://api.example.test/v1/chat/completions"},
		{"https://api.example.test/openai", "https://api.example.test/openai/v1/chat/completions"},
		{"https://api.example.test/v1/chat/completions", "https://api.example.test/v1/chat/completions"},
	}
	for _, tc := range cases {
		got, err := ChatCompletionsURL(tc.raw)
		if err != nil {
			t.Fatalf("ChatCompletionsURL(%q) error: %v", tc.raw, err)
		}
		if got != tc.want {
			t.Fatalf("ChatCompletionsURL(%q)=%q, want %q", tc.raw, got, tc.want)
		}
	}
}

func TestChatCompletionsURLRejectsEmptyBase(t *testing.T) {
	_, err := ChatCompletionsURL("   ")
	assertCodedError(t, err, "INVALID_ARGUMENT", false)
}
