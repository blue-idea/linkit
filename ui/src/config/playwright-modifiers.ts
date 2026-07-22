export type PlaywrightKeyboardModifier = 'Alt' | 'Control' | 'Meta' | 'Shift';

export function additiveSelectionModifier(platform: string): PlaywrightKeyboardModifier {
  return platform === 'darwin' ? 'Meta' : 'Control';
}
