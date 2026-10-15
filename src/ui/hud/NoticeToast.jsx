import { useAppStore } from '../../state/useAppStore.js'

/** Messaggio breve sopra la scena. Annunciato agli screen reader, mai bloccante. */
export default function NoticeToast() {
  const notice = useAppStore((s) => s.notice)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 flex justify-center px-4"
      style={{ zIndex: 'var(--z-hud)', top: '42%' }}
      role="status"
      aria-live="polite"
    >
      {notice && (
        <p
          key={notice.id}
          className="border border-line-strong bg-bg-base/85 px-4 py-3 text-center font-mono uppercase text-text-primary backdrop-blur-sm"
          style={{ fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wide)' }}
        >
          <span className="text-accent-flame">●</span> {notice.text}
        </p>
      )}
    </div>
  )
}
