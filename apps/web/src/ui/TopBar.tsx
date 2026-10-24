import { identity } from '../identity';
import { loadSample } from './loader';
import { Logo } from './Logo';
import { useStore } from './store';

export function TopBar() {
  const samples = useStore((s) => s.samples);
  const sampleId = useStore((s) => s.sampleId);
  const setDialog = useStore((s) => s.setDialog);
  const current = samples.find((s) => s.id === sampleId);

  return (
    <header className="topbar">
      <a className="brand" href="#" onClick={(e) => (e.preventDefault(), setDialog('about'))} aria-label={`About ${identity.projectName}`}>
        <Logo />
        <span className="brand-name">{identity.projectName}</span>
      </a>
      {samples.length > 0 && (
        <label className="picker">
          <span className="sr-only">Sample proof</span>
          <select value={sampleId ?? ''} onChange={(e) => void loadSample(e.target.value)}>
            {samples.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.title}
              </option>
            ))}
          </select>
          {current && <span className="picker-blurb">{current.blurb}</span>}
        </label>
      )}
      <span className="mode-badge" title="Replaying traces Lean generated ahead of time. No server involved.">
        Demo
      </span>
      <button className="btn icon ghost" onClick={() => setDialog('help')} aria-label="Keyboard shortcuts" title="Shortcuts (?)">
        ?
      </button>
    </header>
  );
}
