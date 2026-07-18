/**
 * REQ-002-AC-004：存在本机数据时，恢复种子示例必须二次确认。
 */
export function shouldConfirmSeedRestore(hasLocalData: boolean): boolean {
  return hasLocalData;
}

export function applySeedRestore(options: {
  hasLocalData: boolean;
  confirmed: boolean;
}): 'blocked' | 'applied' {
  if (options.hasLocalData && !options.confirmed) {
    return 'blocked';
  }
  return 'applied';
}
