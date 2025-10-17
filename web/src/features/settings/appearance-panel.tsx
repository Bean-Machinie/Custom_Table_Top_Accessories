import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Panel } from '../../components/ui/panel';
import { ThemeId, useTheme } from '../../stores/theme-store';

const getThemeDescription = (id: ThemeId, description: string) => description;

export const AppearancePanel = () => {
  const { themes, themeId, setTheme } = useTheme();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      themes.findIndex((preset) => preset.id === themeId),
      0
    )
  );

  useEffect(() => {
    const nextIndex = themes.findIndex((preset) => preset.id === themeId);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [themeId, themes]);

  const handleSelect = (presetId: ThemeId, index: number) => {
    setActiveIndex(index);
    setTheme(presetId);
    cardRefs.current[index]?.blur();
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const total = themes.length;
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (index + 1) % total;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (index - 1 + total) % total;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = total - 1;
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleSelect(themes[index].id, index);
      return;
    }

    if (nextIndex !== index) {
      setActiveIndex(nextIndex);
      cardRefs.current[nextIndex]?.focus();
    }
  };

  const previews = useMemo(() => themes, [themes]);

  return (
    <Panel className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-surface">Appearance</h2>
        <p className="text-sm text-muted">Choose a theme to personalise the editor. Changes apply immediately.</p>
      </header>
      <div role="radiogroup" aria-label="Theme presets" className="grid gap-4 sm:grid-cols-2">
        {previews.map((preset, index) => {
          const isActive = themeId === preset.id;
          return (
            <button
              key={preset.id}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(preset.id, index)}
              onKeyDown={handleKeyDown(index)}
              tabIndex={index === activeIndex ? 0 : -1}
              className={`flex flex-col gap-3 rounded-lg border ${
                isActive ? 'border-accent ring-2 ring-accent/40' : 'border-border/60'
              } bg-background/80 p-4 text-left shadow-floating transition hover:border-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-surface">{preset.label}</p>
                  <p className="text-xs text-muted">{getThemeDescription(preset.id, preset.description)}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted">{isActive ? 'Active' : 'Preview'}</span>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {preset.preview.map((color) => (
                  <span
                    key={color}
                    className="h-8 w-full rounded-md border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
};
