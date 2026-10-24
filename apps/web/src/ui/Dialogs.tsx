import { useEffect, useRef, type ReactNode } from 'react';
import { identity, isPlaceholder } from '../identity';
import { Logo } from './Logo';
import { SHORTCUTS } from './shortcuts';
import { useStore } from './store';

function Dialog({ title, children }: { title: string; children: ReactNode }) {
  const setDialog = useStore((s) => s.setDialog);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog" aria-label={title} onClose={() => setDialog('none')} onClick={(e) => e.target === ref.current && setDialog('none')}>
      <header className="dialog-head">
        <h2>{title}</h2>
        <button className="btn icon ghost" onClick={() => setDialog('none')} aria-label="Close">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function Dialogs() {
  const dialog = useStore((s) => s.dialog);
  const leanVersion = useStore((s) => s.trace?.meta.leanVersion);
  if (dialog === 'help') {
    return (
      <Dialog title="Shortcuts">
        <dl className="shortcuts">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys}>
              <dt>
                {keys.split(/\s{2,}| \/ /).map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <p className="muted small">Click any proof line in the code to jump straight to it.</p>
      </Dialog>
    );
  }
  if (dialog === 'about') {
    const who = isPlaceholder(identity.yourName) ? 'someone who hasn’t filled in identity.ts yet' : identity.yourName;
    return (
      <Dialog title={`About ${identity.projectName}`}>
        <div className="about">
          <Logo size={40} />
          <p>
            <strong>Watch a Lean proof think.</strong> Step through a Lean 4 proof one line at a time while the picture on the right
            keeps up: goals split, hypotheses arrive, goals turn gold when proved.
          </p>
          {!isPlaceholder(identity.oneLineStory) && <p>{identity.oneLineStory}</p>}
          <p className="muted small">
            Every proof state here was printed by Lean{leanVersion ? ` ${leanVersion}` : ''} when the traces were generated. Nothing is
            hand-written. The extractor that reads Lean's InfoTree is itself written in Lean.
          </p>
          <p>
            Built by {who}
            {!isPlaceholder(identity.teamName) && ` (${identity.teamName})`}
            {!isPlaceholder(identity.collegeOrOrg) && `, ${identity.collegeOrOrg}`} for {identity.event}.
          </p>
          {!isPlaceholder(identity.repoUrl) && (
            <p>
              <a href={identity.repoUrl}>Source on GitHub</a>
            </p>
          )}
        </div>
      </Dialog>
    );
  }
  return null;
}
