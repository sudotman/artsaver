import React from 'react';
import { AppSettings } from '../services/settingsStore';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

const ALL_SOURCES = [
  { id: 'met', label: 'Metropolitan Museum of Art' },
  { id: 'chicago', label: 'Art Institute of Chicago' },
  { id: 'rijks', label: 'Rijksmuseum' },
];

export function SettingsPanel({ settings, onUpdate, onClose }: SettingsPanelProps) {
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: 420,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#141414',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '32px 28px',
          zIndex: 201,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '0.08em',
              color: 'var(--color-text)',
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <SettingGroup label="Shuffle Interval">
          <RangeInput
            min={15}
            max={300}
            step={5}
            value={settings.intervalSeconds}
            onChange={v => onUpdate({ intervalSeconds: v })}
            format={v => v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${v % 60 ? (v % 60) + 's' : ''}`}
          />
        </SettingGroup>

        <SettingGroup label="Display Mode">
          <Toggle
            checked={settings.immersiveMode}
            onChange={v => onUpdate({ immersiveMode: v })}
            label="Immersive mode (hide label until hover)"
          />
        </SettingGroup>

        <SettingGroup label="Idle Auto-Activation">
          <Toggle
            checked={settings.idleEnabled}
            onChange={v => onUpdate({ idleEnabled: v })}
            label="Auto-show when computer is idle"
          />
          {settings.idleEnabled && (
            <RangeInput
              min={1}
              max={30}
              step={1}
              value={settings.idleThresholdMinutes}
              onChange={v => onUpdate({ idleThresholdMinutes: v })}
              format={v => `${v} minute${v !== 1 ? 's' : ''}`}
            />
          )}
        </SettingGroup>

        <SettingGroup label="Art Sources">
          {ALL_SOURCES.map(s => (
            <Toggle
              key={s.id}
              checked={settings.enabledSources.includes(s.id)}
              onChange={checked => {
                const next = checked
                  ? [...settings.enabledSources, s.id]
                  : settings.enabledSources.filter(x => x !== s.id);
                if (next.length > 0) onUpdate({ enabledSources: next });
              }}
              label={s.label}
            />
          ))}
        </SettingGroup>

        <SettingGroup label="Local Folder">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSelectFolder}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '8px 16px',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {settings.localFolderPath ? 'Change folder' : 'Select folder'}
            </button>
            {settings.localFolderPath && (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {settings.localFolderPath}
              </span>
            )}
          </div>
          {settings.localFolderPath && (
            <div style={{ marginTop: 8 }}>
              <Toggle
                checked={settings.enabledSources.includes('local')}
                onChange={checked => {
                  const next = checked
                    ? [...settings.enabledSources, 'local']
                    : settings.enabledSources.filter(x => x !== 'local');
                  if (next.length > 0) onUpdate({ enabledSources: next });
                }}
                label="Include local artwork"
              />
            </div>
          )}
          {settings.localFolderPath && (
            <button
              onClick={() => onUpdate({ localFolderPath: null, enabledSources: settings.enabledSources.filter(x => x !== 'local') })}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: 'none',
                color: '#a05050',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Remove folder
            </button>
          )}
        </SettingGroup>
      </div>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        padding: '4px 0',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
      }}
    >
      <div
        onClick={e => { e.preventDefault(); onChange(!checked); }}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)',
          position: 'relative',
          transition: 'background var(--transition-fast)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left var(--transition-fast)',
          }}
        />
      </div>
      <span>{label}</span>
    </label>
  );
}

function RangeInput({ min, max, step, value, onChange, format }: {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          flex: 1,
          accentColor: 'var(--color-accent)',
          height: 4,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {format(value)}
      </span>
    </div>
  );
}
