import { identity } from '../identity';
import { closeEditor, openEditor, useLive } from './live';
import { loadSample } from './loader';
import { Logo } from './Logo';
import { LIVE_ID, useStore } from './store';

const LIVE_OPTION = '__live__';

export function TopBar() {
  const samples = useStore((s) => s.samples);
  const sampleId = useStore((s) => s.sampleId);
  const liveTitle = useStore((s) => (s.sampleId === LIVE_ID ? s.trace?.meta.title : undefined));
  const setDialog = useStore((s) => s.setDialog);
  const editing = useLive((s) => s.editing);
  const availability = useLive((s) => s.availability);
  const current = samples.find((s) => s.id === sampleId);
  const isLive = sampleId === LIVE_ID || editing;
  const liveOffered = availability !== 'no' || sampleId === LIVE_ID;

  const onPick = (value: string) => {
    if (value === LIVE_OPTION) return openEditor();
    closeEditor();
    void loadSample(value);
  };

  return (
    <header className="topbar">
      <a className="brand" href="#" onClick={(e) => (e.preventDefault(), setDialog('about'))} aria-label={`About ${identity.projectName}`}>
        <Logo />
        <span className="brand-name">{identity.projectName}</span>
      </a>
      {samples.length > 0 && (
        <label className="picker">
          <span className="sr-only">Sample proof</span>
          <select
            value={isLive ? LIVE_OPTION : (sampleId ?? '')}
            onChange={(e) => {
              // Give the keyboard back to the player, or → would change the sample instead of stepping.
              e.target.blur();
              onPick(e.target.value);
            }}
          >
            {samples.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.title}
              </option>
            ))}
            {liveOffered && <option value={LIVE_OPTION}>{liveTitle ? `Live: ${liveTitle}` : '+ Your own proof (live)'}</option>}
          </select>
          {isLive ? (
            <span className="picker-blurb">{editing ? 'Paste or upload Lean, then Run.' : 'Your proof, checked by Lean.'}</span>
          ) : (
            current && <span className="picker-blurb">{current.blurb}</span>
          )}
        </label>
      )}
      {sampleId === LIVE_ID && !editing && (
        <button className="btn small" onClick={openEditor} title="Edit this proof and run it again">
          Edit
        </button>
      )}
      <span
        className={`mode-badge${isLive ? ' is-live' : ''}`}
        title={isLive ? 'Lean ran this on the live server.' : 'Replaying traces Lean generated ahead of time. No server involved.'}
      >
        {isLive ? 'Live' : 'Demo'}
      </span>
      <button className="btn icon ghost" onClick={() => setDialog('help')} aria-label="Keyboard shortcuts" title="Shortcuts (?)">
        ?
      </button>
    </header>
  );
}
