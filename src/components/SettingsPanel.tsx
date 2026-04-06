import React, { useEffect, useState } from 'react';
import { AppSettings, ALL_SOURCES, ALL_CATEGORIES, TRANSITION_TYPES, TransitionType } from '../services/settingsStore';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdate, onClose }: SettingsPanelProps) {
  const [cacheStats, setCacheStats] = useState<{ count: number; totalSizeBytes: number } | null>(null);
  const [lanIp, setLanIp] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI && settings.offlineCacheEnabled) {
      window.electronAPI.getCacheStats().then(setCacheStats);
    }
  }, [settings.offlineCacheEnabled]);

  useEffect(() => {
    if (window.electronAPI && settings.tvServerEnabled) {
      window.electronAPI.getLanIp().then(setLanIp);
    }
  }, [settings.tvServerEnabled]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      onUpdate({ localFolderPath: folder });
      if (!settings.enabledSources.includes('local')) {
        onUpdate({ enabledSources: [...settings.enabledSources, 'local'] });
      }
    }
  };

  const handleClearCache = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.clearCache();
    setCacheStats({ count: 0, totalSizeBytes: 0 });
  };

  const handleExport = () => window.electronAPI?.exportConfig();
  const handleImport = async () => {
    if (!window.electronAPI) return;
    const imported = await window.electronAPI.importConfig();
    if (imported) {
      onUpdate(imported as Partial<AppSettings>);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 460, maxHeight: '85vh', overflowY: 'auto',
          background: '#141414', border: '1px solid var(--color-border)', borderRadius: 12,
          padding: '32px 28px', zIndex: 201,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            Settings
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
            &times;
          </button>
        </div>

        {/* Shuffle interval */}
        <SettingGroup label="Shuffle Interval">
          <RangeInput min={15} max={300} step={5} value={settings.intervalSeconds}
            onChange={v => onUpdate({ intervalSeconds: v })}
            format={v => v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${v % 60 ? (v % 60) + 's' : ''}`} />
        </SettingGroup>

        {/* Transition */}
        <SettingGroup label="Transition Style">
          <Select
            value={settings.transitionType}
            options={TRANSITION_TYPES.map(t => ({ value: t.id, label: t.label }))}
            onChange={v => onUpdate({ transitionType: v as TransitionType })}
          />
        </SettingGroup>

        {/* Display */}
        <SettingGroup label="Display">
          <Toggle checked={settings.immersiveMode} onChange={v => onUpdate({ immersiveMode: v })} label="Immersive mode (hide label until hover)" />
          <Toggle checked={settings.highContrastLabels} onChange={v => onUpdate({ highContrastLabels: v })} label="High-contrast labels (accessibility)" />
          <Toggle checked={settings.screenReaderAnnounce} onChange={v => onUpdate({ screenReaderAnnounce: v })} label="Screen reader announcements" />
        </SettingGroup>

        {/* Category preference */}
        <SettingGroup label="Preferred Category">
          <Select
            value={settings.preferredCategory}
            options={ALL_CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
            onChange={v => onUpdate({ preferredCategory: v })}
          />
        </SettingGroup>

        {/* Art sources */}
        <SettingGroup label="Art Sources">
          {ALL_SOURCES.map(s => (
            <Toggle key={s.id}
              checked={settings.enabledSources.includes(s.id)}
              onChange={checked => {
                const next = checked ? [...settings.enabledSources, s.id] : settings.enabledSources.filter(x => x !== s.id);
                if (next.length > 0) onUpdate({ enabledSources: next });
              }}
              label={s.label} />
          ))}
        </SettingGroup>

        {/* Source weighting */}
        <SettingGroup label="Source Weighting">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Higher = more frequent. Default is 1 for each.
          </p>
          {settings.enabledSources.filter(s => s !== 'local').map(src => (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text)', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ALL_SOURCES.find(s => s.id === src)?.label.split(' ')[0] || src}
              </span>
              <RangeInput min={1} max={5} step={1} value={settings.sourceWeights[src] ?? 1}
                onChange={v => onUpdate({ sourceWeights: { ...settings.sourceWeights, [src]: v } })}
                format={v => `${v}x`} />
            </div>
          ))}
        </SettingGroup>

        {/* Idle */}
        <SettingGroup label="Idle Auto-Activation">
          <Toggle checked={settings.idleEnabled} onChange={v => onUpdate({ idleEnabled: v })} label="Auto-show when computer is idle" />
          {settings.idleEnabled && (
            <RangeInput min={1} max={30} step={1} value={settings.idleThresholdMinutes}
              onChange={v => onUpdate({ idleThresholdMinutes: v })}
              format={v => `${v} min`} />
          )}
        </SettingGroup>

        {/* Audio */}
        <SettingGroup label="Ambient Audio">
          <Toggle checked={settings.audioEnabled} onChange={v => onUpdate({ audioEnabled: v })} label="Soft museum ambience" />
          {settings.audioEnabled && (
            <RangeInput min={0} max={100} step={5} value={Math.round(settings.audioVolume * 100)}
              onChange={v => onUpdate({ audioVolume: v / 100 })}
              format={v => `${v}%`} />
          )}
        </SettingGroup>

        {/* Local folder */}
        <SettingGroup label="Local Folder">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ActionBtn onClick={handleSelectFolder}>
              {settings.localFolderPath ? 'Change folder' : 'Select folder'}
            </ActionBtn>
            {settings.localFolderPath && (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {settings.localFolderPath}
              </span>
            )}
          </div>
          {settings.localFolderPath && (
            <>
              <div style={{ marginTop: 8 }}>
                <Toggle checked={settings.enabledSources.includes('local')}
                  onChange={checked => {
                    const next = checked ? [...settings.enabledSources, 'local'] : settings.enabledSources.filter(x => x !== 'local');
                    if (next.length > 0) onUpdate({ enabledSources: next });
                  }}
                  label="Include local artwork" />
              </div>
              <button onClick={() => onUpdate({ localFolderPath: null, enabledSources: settings.enabledSources.filter(x => x !== 'local') })}
                style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#a05050', fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                Remove folder
              </button>
            </>
          )}
        </SettingGroup>

        {/* Offline cache */}
        <SettingGroup label="Offline Cache">
          <Toggle checked={settings.offlineCacheEnabled} onChange={v => onUpdate({ offlineCacheEnabled: v })} label="Cache images for offline use" />
          {settings.offlineCacheEnabled && (
            <>
              <RangeInput min={20} max={500} step={10} value={settings.offlineCacheSize}
                onChange={v => onUpdate({ offlineCacheSize: v })}
                format={v => `${v} images`} />
              {cacheStats && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {cacheStats.count} cached ({(cacheStats.totalSizeBytes / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
              <button onClick={handleClearCache} style={{
                marginTop: 8, background: 'transparent', border: 'none', color: '#a05050',
                fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
              }}>
                Clear cache
              </button>
            </>
          )}
        </SettingGroup>

        {/* System */}
        <SettingGroup label="System">
          <Toggle checked={settings.autoStart} onChange={v => {
            onUpdate({ autoStart: v });
            window.electronAPI?.setAutoStart(v);
          }} label="Start on login (minimized to tray)" />
          <Toggle checked={settings.companionWidgetEnabled} onChange={v => {
            onUpdate({ companionWidgetEnabled: v });
            window.electronAPI?.toggleCompanionWidget(v);
          }} label="Companion widget (always-on-top mini display)" />
        </SettingGroup>

        {/* TV / Network */}
        <SettingGroup label="Network / TV">
          <Toggle checked={settings.tvServerEnabled} onChange={v => {
            onUpdate({ tvServerEnabled: v });
            if (window.electronAPI) {
              if (v) window.electronAPI.startTvServer(settings.tvServerPort);
              else window.electronAPI.stopTvServer();
            }
          }} label="Serve artwork over HTTP (for Projectivy / smart TVs)" />
          {settings.tvServerEnabled && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)' }}>Port:</span>
                <input type="number" min={1024} max={65535} value={settings.tvServerPort}
                  onChange={e => onUpdate({ tvServerPort: Number(e.target.value) })}
                  style={{
                    width: 80, padding: '4px 8px', background: '#1a1a1a', color: 'var(--color-text)',
                    border: '1px solid var(--color-border)', borderRadius: 4,
                    fontFamily: 'var(--font-body)', fontSize: 13,
                  }} />
              </div>
              {lanIp && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 6 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>
                    Gallery page (open in TV browser):
                  </p>
                  <code style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-accent)', wordBreak: 'break-all', display: 'block', marginBottom: 8 }}>
                    http://{lanIp}:{settings.tvServerPort}/
                  </code>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
                    Projectivy Launcher (Background &gt; URI, image only):
                  </p>
                  <code style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                    http://{lanIp}:{settings.tvServerPort}/current.jpg
                  </code>
                </div>
              )}
            </>
          )}
        </SettingGroup>

        {/* Import/export */}
        <SettingGroup label="Configuration">
          <div style={{ display: 'flex', gap: 8 }}>
            <ActionBtn onClick={handleExport}>Export config</ActionBtn>
            <ActionBtn onClick={handleImport}>Import config</ActionBtn>
          </div>
        </SettingGroup>
      </div>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
      <div onClick={e => { e.preventDefault(); onChange(!checked); }}
        style={{ width: 36, height: 20, borderRadius: 10, background: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background var(--transition-fast)', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: checked ? 18 : 2, transition: 'left var(--transition-fast)' }} />
      </div>
      <span>{label}</span>
    </label>
  );
}

function RangeInput({ min, max, step, value, onChange, format }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--color-accent)', height: 4 }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', minWidth: 60, textAlign: 'right' }}>
        {format(value)}
      </span>
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 12px', background: '#1a1a1a', color: 'var(--color-text)',
        border: '1px solid var(--color-border)', borderRadius: 6,
        fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
        WebkitAppearance: 'none' as any,
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '8px 16px', color: 'var(--color-text)',
      fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}
