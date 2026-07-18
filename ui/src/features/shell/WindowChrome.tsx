import { Icon, Kbd } from '../../components/ui';

type WindowChromeProps = {
  onSpotlight: () => void;
  onNew: () => void;
  onSettings: () => void;
  user: { email: string } | null;
  storageMode: string;
  sidebarOpen: boolean;
  detailOpen: boolean;
  onToggleSidebar: () => void;
  onToggleDetail: () => void;
};

/**
 * 主窗口顶栏：核心操作与面板折叠。
 * REQ-024-AC-001 / REQ-024-AC-006
 */
export function WindowChrome({
  onSpotlight,
  onNew,
  onSettings,
  user,
  storageMode,
  sidebarOpen,
  detailOpen,
  onToggleSidebar,
  onToggleDetail,
}: WindowChromeProps) {
  return (
    <header
      className="h-11 shrink-0 glass-strong border-b border-white/5 flex items-center px-4 gap-3 no-select relative"
      aria-label="Top bar"
    >
      <div className="flex items-center gap-2" aria-hidden>
        <span className="w-3 h-3 rounded-full bg-coral-500" />
        <span className="w-3 h-3 rounded-full bg-amber-500" />
        <span className="w-3 h-3 rounded-full bg-mint-500" />
      </div>

      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="切换侧边栏"
        aria-pressed={sidebarOpen}
        title="切换侧边栏"
        className={`w-7 h-7 rounded-md flex items-center justify-center transition focus-ring ${
          sidebarOpen ? 'text-ink-200 hover:bg-ink-700/60' : 'text-ink-500 hover:bg-ink-700/60'
        }`}
      >
        <Icon name="PanelLeft" size={14} />
      </button>

      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-100">
        <span className="w-4 h-4 rounded bg-gradient-to-br from-accent-500 to-mint-500 flex items-center justify-center">
          <Icon name="Boxes" size={10} className="text-white" />
        </span>
        Lattice
        <span className="text-ink-600 font-normal hidden sm:inline">—</span>
        <span className="text-[12px] text-ink-400 font-normal hidden sm:inline">网址收藏管理</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:flex items-center gap-1.5 text-[10px] text-ink-400 px-2 py-1 rounded-md bg-ink-800/50 hairline">
          <Icon name={storageMode === 'cloud' ? 'Cloud' : 'HardDrive'} size={10} />
          {storageMode === 'cloud' ? '云存储' : '本地存储'}
        </span>
        {user && (
          <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-ink-300 max-w-[160px]">
            <Icon name="User" size={11} className="text-ink-400" />
            <span className="truncate">{user.email}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onSpotlight}
          aria-label="搜索"
          className="flex items-center gap-2 rounded-md bg-ink-800/60 hairline px-2.5 py-1 text-[11px] text-ink-400 hover:text-ink-200 transition focus-ring"
        >
          <Icon name="Search" size={11} />
          <span className="hidden sm:inline">搜索</span>
          <span className="flex items-center gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label="新增"
          className="flex items-center gap-1.5 rounded-md bg-ink-800/60 hairline px-2.5 py-1 text-[11px] text-ink-400 hover:text-ink-200 transition focus-ring"
        >
          <Icon name="Plus" size={11} />
          <span className="hidden sm:inline">新增</span>
        </button>
        <button
          type="button"
          onClick={onSettings}
          aria-label="设置"
          title="设置"
          className="w-7 h-7 rounded-md bg-ink-800/60 hairline text-ink-400 hover:text-ink-200 flex items-center justify-center transition focus-ring"
        >
          <Icon name="Settings" size={13} />
        </button>
        <button
          type="button"
          onClick={onToggleDetail}
          aria-label="切换详情面板"
          aria-pressed={detailOpen}
          title="切换详情面板"
          className={`w-7 h-7 rounded-md flex items-center justify-center transition focus-ring ${
            detailOpen ? 'text-ink-200 hover:bg-ink-700/60' : 'text-ink-500 hover:bg-ink-700/60'
          }`}
        >
          <Icon name="PanelRight" size={14} />
        </button>
      </div>
    </header>
  );
}
