import { useState } from 'react';
import { Icon, Button } from '../../../components/ui';
import type { ComposePreviewMember } from './index';
import { useI18n } from '../../../i18n/use-i18n';

/**
 * 主题组合创建预览对话框（确认前不写库）。
 * REQ-013-AC-001 / REQ-013-AC-002
 */
export function ComposePreviewDialog({
  members,
  onCancel,
  onConfirm,
}: {
  members: ComposePreviewMember[];
  onCancel: () => void;
  onConfirm: (values: { name: string; emoji: string; description: string }) => void;
}) {
  const i18n = useI18n();
  const [name, setName] = useState(() => i18n.t('collection.new'));
  const [emoji, setEmoji] = useState('🧩');
  const [description, setDescription] = useState('');

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-preview-title"
        className="w-full max-w-md rounded-mac-xl glass-strong shadow-win border border-white/10 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
            <Icon name="Library" size={16} className="text-accent-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="compose-preview-title" className="text-[15px] font-semibold text-ink-100">
              {i18n.t('collection.compose.title')}
            </h2>
            <p className="text-[12px] text-ink-400 mt-1">
              {i18n.t('collection.compose.body', { count: members.length })}
            </p>

            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="compose-name">
              {i18n.t('collection.name')}
            </label>
            <input
              id="compose-name"
              aria-label={i18n.t('collection.compose.nameLabel')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring"
              autoFocus
            />

            <div className="mt-3 grid grid-cols-[88px_1fr] gap-2">
              <div>
                <label className="block text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="compose-emoji">
                  {i18n.t('collection.emoji')}
                </label>
                <input
                  id="compose-emoji"
                  aria-label={i18n.t('collection.compose.emojiLabel')}
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring text-center"
                />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-ink-300 mb-1.5">{i18n.t('collection.compose.members')}</span>
                <ul
                  aria-label={i18n.t('collection.compose.membersLabel')}
                  className="max-h-28 overflow-y-auto rounded-lg bg-ink-800/40 hairline px-2 py-1.5 space-y-1"
                >
                  {members.map((member) => (
                    <li key={member.id} className="text-[12px] text-ink-200 truncate">
                      {member.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="block mt-3 text-[11px] font-medium text-ink-300 mb-1.5" htmlFor="compose-description">
              {i18n.t('collection.description')}
            </label>
            <textarea
              id="compose-description"
              aria-label={i18n.t('collection.compose.descriptionLabel')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-ink-800/60 hairline px-3 py-2 text-[13px] text-ink-100 outline-none focus-ring resize-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" aria-label={i18n.t('collection.compose.cancel')} onClick={onCancel}>
            {i18n.t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            aria-label={i18n.t('collection.compose.confirm')}
            disabled={!name.trim()}
            onClick={() =>
              onConfirm({
                name: name.trim(),
                emoji: emoji.trim() || '🧩',
                description,
              })
            }
          >
            {i18n.t('common.create')}
          </Button>
        </div>
      </div>
    </div>
  );
}
