import type { LibraryData } from '../../domain/library';
import { recommendLibraryBookmarks } from '../explore';

export type GraphRelation = 'shared-tag' | 'shared-collection' | 'ai-related';
export interface KnowledgeGraphNode { id: string; label: string; x: number; y: number; center: boolean }
export interface KnowledgeGraphEdge { sourceId: string; targetId: string; relation: GraphRelation; label: string }
export interface KnowledgeGraph { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] }

const RELATION_LABELS: Record<GraphRelation, string> = {
  'shared-tag': 'Shared tag',
  'shared-collection': 'Shared collection',
  'ai-related': 'AI related',
};

/** 构建确定性径向图：中心固定，外围按 ID 排序后均匀分布。 */
export function buildKnowledgeGraph(
  library: LibraryData,
  centerId: string,
  aiRelations: Array<{ bookmarkId: string; score: number }> = [],
): KnowledgeGraph {
  const center = library.bookmarks.find(({ id }) => id === centerId);
  if (!center) return { nodes: [], edges: [] };
  const ruleRecommendations = recommendLibraryBookmarks(library, centerId);
  const ruleById = new Map(ruleRecommendations.map((item) => [item.bookmarkId, item]));
  const libraryIds = new Set(library.bookmarks.map(({ id }) => id));
  const aiIds = aiRelations
    .filter(({ bookmarkId, score }) => libraryIds.has(bookmarkId) && bookmarkId !== centerId && score > 0)
    .map(({ bookmarkId }) => bookmarkId);
  const relatedIds = [...new Set([...ruleById.keys(), ...aiIds])].sort().slice(0, 8);
  const radius = 112;
  const nodes: KnowledgeGraphNode[] = [
    { id: center.id, label: center.title, x: 200, y: 160, center: true },
    ...relatedIds.map((id, index) => {
      const bookmark = library.bookmarks.find((item) => item.id === id)!;
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(relatedIds.length, 1);
      return {
        id, label: bookmark.title,
        x: Number((200 + Math.cos(angle) * radius).toFixed(3)),
        y: Number((160 + Math.sin(angle) * radius).toFixed(3)),
        center: false,
      };
    }),
  ];
  const edges = relatedIds.map((id): KnowledgeGraphEdge => {
    const rule = ruleById.get(id);
    const relation: GraphRelation = rule?.reasons.includes('shared-collection')
      ? 'shared-collection'
      : rule?.reasons.includes('shared-tag') ? 'shared-tag' : 'ai-related';
    return { sourceId: centerId, targetId: id, relation, label: RELATION_LABELS[relation] };
  });
  return { nodes, edges };
}

export { KnowledgeGraphDialog } from './KnowledgeGraphDialog';
