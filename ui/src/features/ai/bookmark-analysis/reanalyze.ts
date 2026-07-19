/**
 * 重新分析确认：仅在 confirmed 时返回可写入 patch；拒绝的标签不入选。
 * REQ-020-AC-001 / REQ-020-AC-002
 */
export function applyReanalyzeConfirmation(input: {
  bookmark: {
    id: string;
    title: string;
    description?: string;
    aiSummary?: string;
    tags: string[];
    aiSuggestedTags: string[];
  };
  preview: {
    description: string;
    summary: string;
    suggestedTags: string[];
  };
  confirmed: boolean;
  acceptedTagLabels: string[];
  resolveTagId: (label: string) => string | null;
}): { description: string; aiSummary: string; tags: string[]; aiSuggestedTags: string[] } | null {
  if (!input.confirmed) {
    return null;
  }

  const accepted = new Set(input.acceptedTagLabels.map((label) => label.trim()).filter(Boolean));
  const nextTags = [...input.bookmark.tags];
  for (const label of input.preview.suggestedTags) {
    if (!accepted.has(label)) {
      continue;
    }
    const tagId = input.resolveTagId(label);
    if (!tagId || nextTags.includes(tagId)) {
      continue;
    }
    nextTags.push(tagId);
  }

  return {
    description: input.preview.description.trim() || input.bookmark.description || '',
    aiSummary: input.preview.summary,
    tags: nextTags,
    aiSuggestedTags: [],
  };
}
