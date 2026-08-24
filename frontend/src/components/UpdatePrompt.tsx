import { useEffect, useState } from 'react'
import Modal from './Modal'
import { colors, btn, radius, shadow } from '../theme'
import { isTauriApp } from '../lib/api'

interface UpdateInfo {
  version: string
  url: string
  notes: string
}

const versionBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 10px',
  borderRadius: radius.sm,
  background: colors.infoLight,
  color: colors.info,
  fontSize: 12.5,
  fontWeight: 600,
  marginBottom: 12,
}

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'flex-end',
  marginTop: 4,
}

const track: React.CSSProperties = {
  height: 8,
  borderRadius: radius.full,
  background: colors.surfaceSecondary,
  border: `1px solid ${colors.borderLight}`,
  overflow: 'hidden',
  margin: '14px 0 6px',
}

const fill = (percent: number): React.CSSProperties => ({
  height: '100%',
  width: `${Math.min(100, Math.max(0, percent))}%`,
  background: colors.info,
  borderRadius: radius.full,
  transition: 'width 150ms',
})

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron

export default function UpdatePrompt() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [checkDone, setCheckDone] = useState(false)
  const [progress, setProgress] = useState<{ state: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isElectron && !isTauriApp()) return

    let cancelled = false

    const apply = (u: UpdateInfo | null) => {
      if (!cancelled) {
        setInfo(u)
        setCheckDone(true)
      }
    }

    if (isTauriApp()) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        import('@tauri-apps/api/event').then(({ listen }) => {
          const unlistenUpdate = listen('app:update-available', (event: any) => {
            if (!cancelled) {
              setInfo(event.payload)
              setCheckDone(true)
            }
          })

          const unlistenProgress = listen('app:update-progress', (event: any) => {
            if (!cancelled) {
              setProgress(event.payload)
              if (event.payload.state === 'done') {
                setInfo(null)
              }
            }
          })

          invoke('check_update')
            .then((res: any) => { if (!cancelled && res) apply(res) })
            .catch(() => {})

          return () => {
            cancelled = true
            unlistenUpdate.then((fn: () => void) => fn())
            unlistenProgress.then((fn: () => void) => fn())
          }
        })
      })

      return () => { cancelled = true }
    }

    // Electron mode
    const api = (window as any).electronAPI
    const off = api.onUpdateAvailable?.(apply) as (() => void) | undefined
    const offProgress = api.onUpdateProgress?.((p: { state: string; percent: number }) => {
      if (!cancelled) {
        setProgress(p)
        if (p.state === 'done') {
          setInfo(null)
        }
      }
    }) as (() => void) | undefined

    api.checkUpdate().then((res: UpdateInfo | null) => apply(res)).catch(() => setCheckDone(true))

    return () => {
      cancelled = true
      if (typeof off === 'function') off()
      if (typeof offProgress === 'function') offProgress()
    }
  }, [])

  if (!checkDone) return null

  const busy = progress !== null && (progress.state === 'downloading' || progress.state === 'installing')
  const visible = (info !== null) || busy

  const handleSkip = async () => {
    if (isTauriApp()) {
      const { invoke } = await import('@tauri-apps/api/core')
      invoke('skip_update').catch(() => {})
    } else {
      (window as any).electronAPI?.skipUpdate?.()
    }
    setInfo(null)
  }

  const handleInstall = async () => {
    setError(null)
    if (isTauriApp()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('install_update', { url: info?.url })
      } catch (e: any) {
        setError('Tự động cài đặt thất bại. Vui lòng tải về và cài đặt thủ công.')
      }
    } else {
      const res = await (window as any).electronAPI?.installUpdate?.()
      if (res && !res.ok && res.error) setError(res.error)
    }
  }

  const handleManualDownload = () => {
    if (info?.url) {
      window.open(info.url, '_blank')
    }
  }

  return (
    <Modal
      open={visible}
      title={busy ? 'Đang cập nhật phần mềm' : 'Có bản cập nhật phần mềm'}
      onClose={() => {
        if (busy) return
        handleSkip()
      }}
    >
      {busy ? (
        <>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: colors.text }}>
            {progress.state === 'downloading'
              ? `Đang tải bản cập nhật ${info ? info.version : ''}... ${progress.percent}%`
              : 'Đang cài đặt... Windows sẽ hỏi xác nhận (UAC) một lần.'}
          </p>
          <div style={track}>
            <div style={fill(progress.percent)} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.textMuted }}>
            {progress.state === 'downloading' ? 'Vui lòng chờ, không tắt ứng dụng.' : 'Khi cài xong ứng dụng sẽ tự động mở lại.'}
          </p>
        </>
      ) : (
        info && (
          <>
            <div style={versionBadge}>Bản mới {info.version}</div>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: colors.text }}>
              Phiên bản mới đã sẵn sàng, nhấn "Cập nhật ngay" để tự động tải và cài đặt.
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: colors.textMuted }}>
              {info.notes || 'Quá trình tải về rồi tự cài đặt, Windows sẽ hỏi xác nhận (UAC) một lần.'}
            </p>
            {error && (
              <p style={{ margin: '0 0 12px', fontSize: 12.5, color: colors.danger }}>
                {error}
              </p>
            )}
            <div style={actions}>
              <button
                style={{ ...btn(colors.surfaceSecondary, colors.textSecondary, 'md'), border: `1px solid ${colors.border}` }}
                onClick={handleSkip}
              >
                Bỏ qua
              </button>
              {info?.url && (
                <button
                  style={{ ...btn(colors.surfaceSecondary, colors.textSecondary, 'md'), border: `1px solid ${colors.border}` }}
                  onClick={handleManualDownload}
                >
                  Tải về thủ công
                </button>
              )}
              <button
                style={{ ...btn(colors.info, '#fff', 'md'), boxShadow: shadow.cardHover }}
                onClick={handleInstall}
              >
                Cập nhật ngay
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  )
}
