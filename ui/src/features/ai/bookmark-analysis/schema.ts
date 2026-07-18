import { z } from 'zod';

export const aiContextSchema = z.object({
  apiBase: z.string().trim().min(1),
  model: z.string().trim().min(1),
  locale: z.enum(['en', 'zh']),
});

export const analyzeBookmarkResultSchema = z.object({
  title: z.string(),
  summary: z.string().trim().min(1),
  suggestedCategoryId: z.string().trim().min(1).nullable(),
  suggestedTags: z.array(z.string().trim().min(1).max(64)),
});

export type AnalyzeBookmarkResult = z.infer<typeof analyzeBookmarkResultSchema>;
export type AIContext = z.infer<typeof aiContextSchema>;

export interface AnalyzeBookmarkClient {
  analyzeBookmark(input: {
    context: AIContext;
    url: string;
    title: string;
    contentText: string;
    categoryCandidates: Array<{ id: string; name: string }>;
    tagCandidates: Array<{ id: string; label: string }>;
  }): Promise<AnalyzeBookmarkResult>;
  reanalyzeBookmark?(input: {
    context: AIContext;
    url: string;
    title: string;
    contentText: string;
    categoryCandidates: Array<{ id: string; name: string }>;
    tagCandidates: Array<{ id: string; label: string }>;
  }): Promise<AnalyzeBookmarkResult>;
}
