/** 从非空候选集中选择随机项，并防御测试替身返回越界值。 */
export function pickRandomItem<T>(
  items: readonly T[],
  random: () => number = Math.random
): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.floor(random() * items.length);
  const boundedIndex = Math.max(0, Math.min(index, items.length - 1));
  return items[boundedIndex];
}
