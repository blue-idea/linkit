package ai

import (
	"strings"
	"testing"
)

func TestBuildAnalyzeBookmarkSystemPromptLocale(t *testing.T) {
	en := buildAnalyzeBookmarkSystemPrompt("en")
	if !strings.Contains(en, "description") || !strings.Contains(en, "entirely in English") {
		t.Fatalf("en prompt missing English description rule: %s", en)
	}

	zh := buildAnalyzeBookmarkSystemPrompt("zh")
	if !strings.Contains(zh, "description") || !strings.Contains(zh, "Simplified Chinese") {
		t.Fatalf("zh prompt missing Chinese description rule: %s", zh)
	}

	// 未知 locale 回退英文，避免生成语言漂移。
	fallback := buildAnalyzeBookmarkSystemPrompt("")
	if !strings.Contains(fallback, "entirely in English") {
		t.Fatalf("empty locale should fall back to English: %s", fallback)
	}
}
