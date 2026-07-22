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
	// TASK-069 / REQ-006-AC-002：已有候选标签必须保持原始 label，避免按 UI 语言翻译后无法映射。
	if !strings.Contains(en, "Copy matching tagCandidates labels exactly") ||
		!strings.Contains(en, "Do not translate or rewrite candidate labels") {
		t.Fatalf("prompt missing exact candidate tag reuse rule: %s", en)
	}
	if !strings.Contains(en, "Return at most 3 unique suggestedTags") {
		t.Fatalf("prompt missing suggested tag limit: %s", en)
	}
	if strings.Contains(en, "title, description, summary, and suggestedTags entirely in English") {
		t.Fatalf("prompt must not force existing candidate labels into the UI locale: %s", en)
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
