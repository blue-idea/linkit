/** 稳定英文降级文案（UI 文案使用英文）。REQ-006-AC-003 */
export function mapAIFailureMessage(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? '';
  switch (code) {
    case 'SECRET_NOT_CONFIGURED':
      return 'AI API Key is not configured. Fill in the fields manually — no simulated AI result was used.';
    case 'AI_CONSENT_REQUIRED':
      return 'AI data consent is required for this API Base. Confirm consent in Settings, then retry.';
    case 'AI_UNAUTHORIZED':
      return 'AI service rejected the API key. Check your key and try again — no simulated AI result was used.';
    case 'AI_RATE_LIMITED':
      return 'AI service rate limit exceeded. Fill in the fields manually — no simulated AI result was used.';
    case 'AI_TIMEOUT':
      return 'AI request timed out. Fill in the fields manually — no simulated AI result was used.';
    case 'AI_RESPONSE_INVALID':
      return 'AI response was invalid. Fill in the fields manually — no simulated AI result was used.';
    default:
      return 'AI analysis is unavailable. Fill in the fields manually — no simulated AI result was used.';
  }
}
