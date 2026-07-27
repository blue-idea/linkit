export { listSettingsSections } from './sections';
export { ShortcutsPanel } from './ShortcutsPanel';
export { resolveThemeLabel } from './themes';
export {
  buildConsentRecord,
  consentMatchesApiBase,
  requiresAIConsent,
} from './ai-consent';
export type { AIConsentRecord } from './ai-consent';
export { AIConsentDialog } from './ai-consent/AIConsentDialog';
export {
  aiConnectionResultSchema,
  classifyAIConnectionError,
  testAIConnection,
} from './ai-connection';
export type {
  AIConnectionErrorKey,
  AIConnectionResult,
} from './ai-connection';
