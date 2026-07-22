package ai

import "strings"

// buildAnalyzeBookmarkSystemPrompt 按设置语言约束 AI 生成字段语言。
// locale=zh → 简体中文；其余（含 en）→ English。
func buildAnalyzeBookmarkSystemPrompt(locale string) string {
	languageRule := "Write title, description, summary, and any newly suggested tag labels entirely in English."
	if strings.EqualFold(strings.TrimSpace(locale), "zh") {
		languageRule = "Write title, description, summary, and any newly suggested tag labels entirely in Simplified Chinese (简体中文)."
	}

	return "You are Linkit's bookmark analyzer. Reply with a single JSON object only. " +
		`Schema: {"title":"string","description":"string","summary":"string","suggestedCategoryId":"string|null","suggestedTags":["string"]}. ` +
		"description is a short page description rewritten for the user (not a raw website snippet). " +
		"You may use the provided source description and contentText as reference. " +
		"suggestedCategoryId must be one of the provided category candidate ids or null. " +
		"Use tagCandidates as the controlled vocabulary. Copy matching tagCandidates labels exactly, including spelling, punctuation, and language. " +
		"Do not translate or rewrite candidate labels. When tagCandidates is non-empty, suggestedTags must contain only semantically accurate candidate labels; return an empty array when none fit. " +
		"When tagCandidates is empty, suggestedTags may contain new short labels. Return at most 3 unique suggestedTags. Do not wrap in markdown. " +
		languageRule +
		" Match the locale field in the user JSON."
}
