import { useState } from 'react';
import { Icon, Button } from './ui';
import { useI18n } from '../i18n/use-i18n';
import type { UiLocale } from '../types';

export function LoginScreen({
  onSignIn,
  onSignUp,
  onUseLocal,
  loading,
  error,
  locale = 'en',
}: {
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onUseLocal: () => void;
  loading: boolean;
  error: string | null;
  /** 无偏好时默认 en（REQ-023-AC-004）。 */
  locale?: UiLocale;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const i18n = useI18n(locale);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') onSignIn(email, password);
    else onSignUp(email, password);
  };

  return (
    <div className="h-screen w-screen workspace flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-[400px] animate-scale-in">
        <div className="glass-strong rounded-mac-xl shadow-win hairline overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center mx-auto mb-4 hairline">
              <Icon name="Boxes" size={26} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold text-ink-100">Lattice</h1>
            <p className="text-[12px] text-ink-400 mt-1">
              {locale === 'zh' ? '登录以同步你的收藏到云端' : 'Sign in to sync your library to the cloud'}
            </p>
          </div>

          <div className="px-8 mb-4">
            <div className="inline-flex w-full p-0.5 rounded-lg bg-ink-800/70 hairline">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition ${mode === 'signin' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}
              >
                {locale === 'zh' ? '登录' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition ${mode === 'signup' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}
              >
                {locale === 'zh' ? '注册' : 'Sign up'}
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="px-8 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-ink-800/60 hairline text-[13px] text-ink-100 placeholder:text-ink-500 px-3 py-2.5 outline-none focus-ring"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-coral-500/10 border border-coral-400/30 px-3 py-2 text-[12px] text-coral-400 flex items-center gap-2">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <Button variant="primary" className="w-full" disabled={loading}>
              {loading
                ? locale === 'zh'
                  ? '请稍候…'
                  : 'Please wait…'
                : mode === 'signin'
                  ? locale === 'zh'
                    ? '登录'
                    : 'Sign in'
                  : locale === 'zh'
                    ? '创建账户'
                    : 'Create account'}
            </Button>
          </form>

          <div className="px-8 py-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] text-ink-500 uppercase tracking-wider">
              {locale === 'zh' ? '或' : 'or'}
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="px-8 pb-8">
            <button
              type="button"
              onClick={onUseLocal}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-200 hover:text-ink-100 hover:bg-ink-700/60 py-2.5 transition"
            >
              <Icon name="HardDrive" size={14} />
              {i18n.t('auth.localMode')}
            </button>
            <p className="text-[10px] text-ink-500 text-center mt-2.5 leading-relaxed">
              {locale === 'zh'
                ? '本地模式下数据仅保存在本机，登录后可在设置中开启云同步。'
                : 'Local mode keeps data on this device. Sign in later to enable cloud sync in Settings.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
