import type { Bookmark, Category, Collection, AIInsight, SemanticResult } from './types';

// Deterministic pseudo-random from string for stable mock results
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SUMMARY_BANK = [
  '提供结构化文档与交互示例，适合作为日常查阅的权威参考。',
  '以可视化方式呈现核心概念，并附带可直接复用的代码片段。',
  '围绕工具链与最佳实践展开，强调工程化落地路径。',
  '收录高质量案例与社区实践，适合寻找灵感与对标参考。',
  '聚焦开发者体验，提供 API 设计与集成的完整流程。',
  '系统讲解底层原理与调优策略，适合进阶学习。',
];

const TAG_VOCAB: Record<string, string[]> = {
  design: ['t-design', 't-inspiration', 't-ux'],
  css: ['t-css', 't-doc', 't-perf'],
  react: ['t-react', 't-doc', 't-tutorial'],
  ai: ['t-ai', 't-api', 't-doc'],
  tool: ['t-tool', 't-doc'],
  color: ['t-color', 't-design', 't-tool'],
  font: ['t-font', 't-design'],
  perf: ['t-perf', 't-a11y', 't-doc'],
  read: ['t-tutorial', 't-doc'],
};

function inferDomainKey(url: string, title: string): string {
  const s = (url + ' ' + title).toLowerCase();
  if (s.includes('color') || s.includes('配色')) return 'color';
  if (s.includes('font') || s.includes('字体')) return 'font';
  if (s.includes('react')) return 'react';
  if (s.includes('css') || s.includes('tailwind')) return 'css';
  if (s.includes('ai') || s.includes('openai') || s.includes('transformers') || s.includes('langchain')) return 'ai';
  if (s.includes('perf') || s.includes('web.dev') || s.includes('性能')) return 'perf';
  if (s.includes('design') || s.includes('figma') || s.includes('dribbble') || s.includes('awwwards')) return 'design';
  if (s.includes('smashing') || s.includes('css-tricks') || s.includes('mdn')) return 'read';
  return 'tool';
}

/** AI Feature 1: auto summary + tag + category suggestion */
export function aiAnalyzeUrl(url: string, title: string): {
  summary: string;
  tags: string[];
  categoryId: string;
  confidence: number;
} {
  const key = inferDomainKey(url, title);
  const h = hash(url);
  const summary = SUMMARY_BANK[h % SUMMARY_BANK.length];
  const tagPool = TAG_VOCAB[key] ?? TAG_VOCAB.tool;
  const tags = tagPool.slice(0, 2 + (h % 2));
  const catMap: Record<string, string> = {
    color: 'c-color',
    font: 'c-type',
    react: 'c-react',
    css: 'c-css',
    ai: 'c-ai',
    perf: 'c-perf',
    design: 'c-ui',
    read: 'c-read',
    tool: 'c-fe',
  };
  return {
    summary,
    tags,
    categoryId: catMap[key],
    confidence: 0.72 + (h % 28) / 100,
  };
}

/** AI Feature 2: smart collection aggregation — recommend bookmarks that fit a collection */
export function aiRecommendForCollection(
  collection: Collection,
  all: Bookmark[],
  categories: Category[]
): { bookmarkId: string; score: number; reason: string }[] {
  const memberIds = new Set(collection.bookmarkIds);
  const members = all.filter((b) => memberIds.has(b.id));
  // build a profile from members: tag frequency + category frequency
  const tagFreq: Record<string, number> = {};
  const catFreq: Record<string, number> = {};
  members.forEach((b) => {
    b.tags.forEach((t) => (tagFreq[t] = (tagFreq[t] ?? 0) + 1));
    catFreq[b.categoryId] = (catFreq[b.categoryId] ?? 0) + 1;
  });
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  const topCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

  return all
    .filter((b) => !memberIds.has(b.id))
    .map((b) => {
      let score = 0.3;
      const reasons: string[] = [];
      const overlap = b.tags.filter((t) => topTags.includes(t));
      if (overlap.length) {
        score += 0.25 * overlap.length;
        reasons.push(`标签重合 ${overlap.length} 项`);
      }
      if (b.categoryId === topCat) {
        score += 0.2;
        const cat = categories.find((c) => c.id === topCat);
        reasons.push(`同属「${cat?.name ?? '分类'}」`);
      }
      if (b.starred) {
        score += 0.08;
        reasons.push('你标星过');
      }
      score += (hash(b.id + collection.id) % 20) / 100;
      score = Math.min(score, 0.98);
      return { bookmarkId: b.id, score, reason: reasons.join(' · ') || '主题相关度较高' };
    })
    .filter((r) => r.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/** AI Feature 3: semantic search */
export function aiSemanticSearch(
  query: string,
  all: Bookmark[]
): SemanticResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  // lightweight semantic keyword clusters (zh + en)
  const CLUSTERS: { keys: string[]; match: (b: Bookmark) => number }[] = [
    {
      keys: ['配色', '颜色', 'color', 'colour', 'palette', '色卡'],
      match: (b) =>
        ['t-color'].some((t) => b.tags.includes(t)) || /color|配色|coolors/i.test(b.title + b.url) ? 0.9 : 0,
    },
    {
      keys: ['字体', '排版', 'font', 'type', 'typography'],
      match: (b) =>
        ['t-font'].some((t) => b.tags.includes(t)) || /font|字体/i.test(b.title + b.url) ? 0.88 : 0,
    },
    {
      keys: ['灵感', '设计灵感', '案例', 'inspiration', 'showcase'],
      match: (b) =>
        ['t-inspiration', 't-design'].some((t) => b.tags.includes(t)) ? 0.85 : 0,
    },
    {
      keys: ['ai', '人工智能', '模型', '大模型', 'llm', 'gpt'],
      match: (b) => ['t-ai'].some((t) => b.tags.includes(t)) || /ai|openai|transformers|langchain/i.test(b.title) ? 0.9 : 0,
    },
    {
      keys: ['性能', '优化', 'performance', 'perf', 'vite'],
      match: (b) => ['t-perf'].some((t) => b.tags.includes(t)) ? 0.86 : 0,
    },
    {
      keys: ['部署', 'hosting', 'vercel', '上线'],
      match: (b) => /vercel|deploy|部署/i.test(b.title + b.url) ? 0.85 : 0,
    },
    {
      keys: ['文档', '参考', 'doc', 'reference', 'api'],
      match: (b) => ['t-doc', 't-api'].some((t) => b.tags.includes(t)) ? 0.8 : 0,
    },
    {
      keys: ['react', '组件', 'hooks'],
      match: (b) => ['t-react'].some((t) => b.tags.includes(t)) || /react/i.test(b.title) ? 0.9 : 0,
    },
    {
      keys: ['教程', '学习', 'tutorial', 'guide', '入门'],
      match: (b) => ['t-tutorial'].some((t) => b.tags.includes(t)) ? 0.82 : 0,
    },
  ];

  const matched = CLUSTERS.find((c) => c.keys.some((k) => q.includes(k)));
  const results: SemanticResult[] = [];
  for (const b of all) {
    let score = 0;
    let reason = '';
    // token overlap fallback
    const text = (b.title + ' ' + b.description + ' ' + b.notes + ' ' + b.domain).toLowerCase();
    if (matched) {
      const m = matched.match(b);
      if (m > 0) {
        score = Math.max(score, m);
        reason = `语义匹配「${matched.keys[0]}」相关`;
      }
    }
    // direct token overlap
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    const hits = tokens.filter((t) => text.includes(t));
    if (hits.length) {
      const os = Math.min(0.6, 0.18 * hits.length);
      if (os > score) {
        score = os;
        reason = `关键词命中：${hits.slice(0, 3).join('、')}`;
      } else if (reason && os > score * 0.6) {
        reason += ` · 关键词：${hits.slice(0, 2).join('、')}`;
      }
    }
    if (score > 0.2) {
      results.push({ bookmarkId: b.id, score: Math.min(score + (hash(b.id + q) % 8) / 100, 0.99), reason: reason || '相关内容' });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

/** AI Feature 4: insights report */
export function aiBuildInsights(all: Bookmark[], _cols: Collection[]): AIInsight[] {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = all.filter((b) => new Date(b.createdAt).getTime() > weekAgo);
  const tagGrowth: Record<string, number> = {};
  recent.forEach((b) => b.tags.forEach((t) => (tagGrowth[t] = (tagGrowth[t] ?? 0) + 1)));
  const topTag = Object.entries(tagGrowth).sort((a, b) => b[1] - a[1])[0];

  const stale = all.filter((b) => b.lastVisitedAt && Date.now() - new Date(b.lastVisitedAt).getTime() > 30 * 86400000);
  const changed = all.filter((b) => b.health === 'changed');

  const insights: AIInsight[] = [];

  if (topTag) {
    insights.push({
      id: 'i-trend',
      type: 'trend',
      icon: 'TrendingUp',
      title: `「${topTag[0].replace('t-', '').toUpperCase()}」标签本周增长最快`,
      detail: `最近 7 天新增了 ${topTag[1]} 个带此标签的收藏，你的关注重心正向该方向偏移。`,
      action: '查看相关收藏',
      accent: 'blue',
    });
  }
  insights.push({
    id: 'i-collection',
    type: 'collection',
    icon: 'Sparkles',
    title: '「设计灵感」主题有 2 个潜在候选',
    detail: '基于已收录内容的标签与分类画像，Figma、Mobbin 与该主题高度相关，但尚未加入。',
    action: '查看推荐',
    accent: 'violet',
  });
  if (changed.length) {
    insights.push({
      id: 'i-changed',
      type: 'stale',
      icon: 'RefreshCw',
      title: `${changed.length} 个收藏的网页内容发生了更新`,
      detail: 'OpenAI Platform、Mobbin 的页面结构或正文相比上次抓取有明显变化，可能值得复访。',
      action: '查看变更',
      accent: 'amber',
    });
  }
  if (stale.length) {
    insights.push({
      id: 'i-stale',
      type: 'stale',
      icon: 'Clock',
      title: `${stale.length} 个收藏已超过 30 天未访问`,
      detail: '其中部分可能与当前项目无关，可考虑归档或移出活跃主题，减轻信息负担。',
      action: '一键归档',
      accent: 'gray',
    });
  }
  insights.push({
    id: 'i-summary',
    type: 'summary',
    icon: 'BarChart3',
    title: `本周新增 ${recent.length} 个收藏，分布于 ${new Set(recent.map((b) => b.categoryId)).size} 个分类`,
    detail: '收藏节奏稳定，技术类占比最高，设计类次之。建议为新增内容补充备注以提升后续检索命中。',
    accent: 'green',
  });
  return insights;
}

/** Simulate streaming analysis with timed callbacks */
export function aiStreamAnalyze(
  url: string,
  title: string,
  onStep: (step: { label: string; done: boolean }) => void,
  onDone: (r: ReturnType<typeof aiAnalyzeUrl>) => void
) {
  const steps = ['正在抓取网页内容', '解析正文结构', '生成摘要', '推荐分类与标签'];
  let i = 0;
  const tick = () => {
    if (i < steps.length) {
      onStep({ label: steps[i], done: false });
      setTimeout(() => {
        onStep({ label: steps[i], done: true });
        i++;
        if (i < steps.length) setTimeout(tick, 380);
        else setTimeout(() => onDone(aiAnalyzeUrl(url, title)), 200);
      }, 360);
    }
  };
  tick();
}

export function aiSmartReply(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('配色') || q.includes('color')) return '我找到了几个与配色相关的收藏：Coolors 是你最常用的配色工具，Awwwards 里有大量配色案例参考。';
  if (q.includes('字体') || q.includes('font')) return '关于字体，你收藏了 Font Pair，它提供 Google Fonts 的配对方案，可能正是你要找的。';
  if (q.includes('ai') || q.includes('模型')) return '在 AI 方向你有 OpenAI Platform、Transformers 文档和 LangChain 三个收藏，适合搭建实验场主题。';
  if (q.includes('部署') || q.includes('deploy')) return '你收藏了 Vercel，它支持 Git 关联自动部署与预览环境，应该就是你想找的。';
  if (q.includes('性能') || q.includes('perf')) return 'web.dev 与 Vite 都在你收藏的性能优化分类下，前者讲最佳实践，后者是构建工具。';
  return '我基于语义在你的收藏中匹配了相关结果，按相关度排序在下方列表中。';
}
