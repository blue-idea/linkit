import type { BootstrapPhase } from '../../services/storage/bootstrap';

export type StartupView = 'loading' | 'login' | 'main' | 'recovery';

export interface StartupGateInput {
  authLoading: boolean;
  bootstrapPhase: BootstrapPhase | null;
  sessionMode: 'signed_out' | 'local' | 'authenticated';
  recoveryPending: boolean;
}

/**
 * 统一启动视图决策，避免登录/主界面闪烁。
 * REQ-001-AC-005：引导未完成前只显示 loading；本地会话不阻塞于云认证初始化。
 */
export function resolveStartupView(input: StartupGateInput): StartupView {
  if (input.bootstrapPhase === null) {
    return 'loading';
  }
  if (input.bootstrapPhase === 'recovery_required' && input.recoveryPending) {
    return 'recovery';
  }
  // 已进入本地/认证会话时，不再等待 Supabase getSession，避免云初始化拖死本地恢复。
  if (input.sessionMode === 'local' || input.sessionMode === 'authenticated') {
    return 'main';
  }
  if (input.authLoading) {
    return 'loading';
  }
  return 'login';
}
