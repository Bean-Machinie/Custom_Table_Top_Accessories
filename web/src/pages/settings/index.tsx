import clsx from 'classnames';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { AppearancePanel } from '../../features/settings/appearance-panel';
import { ProfilePanel } from '../../features/settings/profile-panel';

type SettingsPanelId = 'profile' | 'appearance';

const PANELS: { id: SettingsPanelId; label: string; description: string }[] = [
  {
    id: 'profile',
    label: 'User Profile',
    description: 'Update your avatar, contact information, and bio.'
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Switch between theme presets for the editor.'
  }
];

const DEFAULT_PANEL: SettingsPanelId = 'profile';

const isPanelId = (value: string | null): value is SettingsPanelId =>
  Boolean(value && PANELS.some((panel) => panel.id === value));

const SettingsPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const panelParam = params.get('panel');
  const activePanel: SettingsPanelId = isPanelId(panelParam) ? panelParam : DEFAULT_PANEL;

  useEffect(() => {
    if (!isPanelId(panelParam)) {
      const next = new URLSearchParams(params);
      next.set('panel', DEFAULT_PANEL);
      setParams(next, { replace: true });
    }
  }, [panelParam, params, setParams]);

  const handleSelect = (panelId: SettingsPanelId) => {
    if (panelId === panelParam) return;
    const next = new URLSearchParams(params);
    next.set('panel', panelId);
    setParams(next, { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-surface">Profile &amp; Settings</h1>
          <p className="text-sm text-muted">Manage your account details and personalise your workspace.</p>
        </div>
        <Button variant="surface" size="sm" onClick={() => navigate('/app')}>
          Back to editor
        </Button>
      </header>
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 flex-row gap-2 rounded-lg border border-border/60 bg-background/70 p-3 text-sm lg:h-fit lg:w-64 lg:flex-col"
        >
          {PANELS.map((panel) => {
            const isActive = activePanel === panel.id;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => handleSelect(panel.id)}
                className={clsx(
                  'flex flex-1 flex-col rounded-md px-3 py-2 text-left transition focus-visible:focus-ring lg:flex-none',
                  isActive
                    ? 'bg-accent/10 text-surface shadow-[0_0_0_1px_var(--color-accent)]'
                    : 'text-muted hover:bg-muted/10'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-sm font-medium">{panel.label}</span>
                <span className="text-xs text-muted">{panel.description}</span>
              </button>
            );
          })}
        </nav>
        <section className="flex-1">
          {activePanel === 'appearance' ? <AppearancePanel /> : <ProfilePanel />}
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;
