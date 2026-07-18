import type { ReactNode } from 'react';
import { WindowChrome } from './WindowChrome';

type AppShellProps = {
  chrome: React.ComponentProps<typeof WindowChrome>;
  sidebar: ReactNode;
  content: ReactNode;
  detail: ReactNode;
  sidebarOpen: boolean;
  detailOpen: boolean;
  syncing?: boolean;
};

/**
 * 主窗口三栏布局壳：Sidebar / Content / Detail。
 * REQ-024-AC-001
 */
export function AppShell({
  chrome,
  sidebar,
  content,
  detail,
  sidebarOpen,
  detailOpen,
  syncing = false,
}: AppShellProps) {
  return (
    <div className="w-full h-full md:max-w-[1400px] md:max-h-[880px] rounded-none md:rounded-mac-xl glass-strong shadow-win overflow-hidden flex flex-col">
      <WindowChrome {...chrome} />

      {syncing && (
        <div className="h-0.5 bg-accent-500/30 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 bg-accent-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {sidebarOpen && (
          <nav
            aria-label="Sidebar"
            className="w-[248px] shrink-0 hidden sm:block animate-slide-down"
          >
            {sidebar}
          </nav>
        )}

        <main aria-label="Content Area" className="flex-1 min-w-0">
          {content}
        </main>

        {detailOpen && (
          <aside
            aria-label="Detail Panel"
            className="w-[320px] shrink-0 hidden lg:block animate-slide-down"
          >
            {detail}
          </aside>
        )}
      </div>
    </div>
  );
}
