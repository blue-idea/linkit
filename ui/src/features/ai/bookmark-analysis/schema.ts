import { z } from 'zod';

export const aiContextSchema = z.object({
  apiBase: z.string().trim().min(1),
  model: z.string().trim().min(1),
  locale: z.enum(['en', 'zh']),
});

export const analyzeBookmarkResultSchema = z.object({
  title: z.string(),
  // 允许缺省以兼容旧绑定；空串时入库预览回退元数据 description。
  description: z.string().optional().default(''),
  summary: z.string().trim().min(1),
  suggestedCategoryId: z.string().trim().min(1).nullable(),
  suggestedTags: z.array(z.string().trim().min(1).max(64)),
});

export type AnalyzeBookmarkResult = z.infer<typeof analyzeBookmarkResultSchema>;
export type AIContext = z.infer<typeof aiContextSchema>;

export type AnalyzeBookmarkInput = {
  context: AIContext;
  url: string;
  title: string;
  description: string;
  contentText: string;
  categoryCandidates: Array<{ id: string; name: string }>;
  tagCandidates: Array<{ id: string; label: string }>;
};

export interface AnalyzeBookmarkClient {
  analyzeBookmark(input: AnalyzeBookmarkInput): Promise<AnalyzeBookmarkResult>;
  reanalyzeBookmark?(input: AnalyzeBookmarkInput): Promise<AnalyzeBookmarkResult>;
}
