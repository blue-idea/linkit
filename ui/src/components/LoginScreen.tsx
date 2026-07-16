import { useState } from 'react';
import { Icon, Button } from './ui';

export function LoginScreen({
  onSignIn,
  onSignUp,
  onUseLocal,
  loading,
  error,
}: {
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onUseLocal: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') onSignIn(email, password);
    else onSignUp(email, password);
  };

  return (
    <div className="h-screen w-screen workspace flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-[400px] animate-scale-in">
        <div className="glass-strong rounded-mac-xl shadow-win hairline overflow-hidden">
          {/* Brand */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center mx-auto mb-4 hairline">
              <Icon name="Boxes" size={26} className="text-white" />
            </div>
            <h1 className="text-[20px] font-bold text-ink-100">Lattice</h1>
            <p className="text-[12px] text-ink-400 mt-1">登录以同步你的收藏到云端</p>
          </div>

          {/* Tabs */}
          <div className="px-8 mb-4">
            <div className="inline-flex w-full p-0.5 rounded-lg bg-ink-800/70 hairline">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition ${mode === 'signin' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}
              >
                登录
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition ${mode === 'signup' ? 'bg-ink-600 text-ink-100' : 'text-ink-400 hover:text-ink-200'}`}
              >
                注册
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-8 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">邮箱</label>
              <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2.5">
                <Icon name="Mail" size={14} className="text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent text-[13px] text-ink-100 placeholder:text-ink-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink-300 mb-1.5 block">密码</label>
              <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 hairline px-3 py-2.5">
                <Icon name="Lock" size={14} className="text-ink-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="flex-1 bg-transparent text-[13px] text-ink-100 placeholder:text-ink-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-coral-500/10 border border-coral-400/30 px-3 py-2 text-[12px] text-coral-400 flex items-center gap-2">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <Button variant="primary" className="w-full" disabled={loading}>
              {loading ? '请稍候…' : mode === 'signin' ? '登录' : '创建账户'}
            </Button>
          </form>

          {/* Divider */}
          <div className="px-8 py-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] text-ink-500 uppercase tracking-wider">或</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Local mode */}
          <div className="px-8 pb-8">
            <button
              onClick={onUseLocal}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink-800/60 hairline text-[12px] text-ink-200 hover:text-ink-100 hover:bg-ink-700/60 py-2.5 transition"
            >
              <Icon name="HardDrive" size={14} />
              使用本地模式（无需登录）
            </button>
            <p className="text-[10px] text-ink-500 text-center mt-2.5 leading-relaxed">
              本地模式下数据仅保存在浏览器，登录后可在设置中开启云同步。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
