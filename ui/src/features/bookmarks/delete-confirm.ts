/** REQ-007-AC-003：删除书签前必须二次确认。 */
export function shouldConfirmBookmarkDelete(): boolean {
  return true;
}

export function applyDeleteDecision(input: { confirmed: boolean }): 'blocked' | 'deleted' {
  return input.confirmed ? 'deleted' : 'blocked';
}
