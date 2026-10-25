// The two tabbed panels: Goal State | Local Context under the editor, and
// Explanation | Tactic Info under the visualization.

import { useState, type ReactNode } from 'react';
import type { Frame } from '../core/frames';
import { GoalPanel } from './GoalPanel';
import { GoalState } from './GoalState';

export function rich(text: string): ReactNode[] {
  return text.split(/(`[^`]*`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

function Tabbed({ label, tabs, children }: { label: string; tabs: readonly string[]; children: (tab: number) => ReactNode }) {
  const [tab, setTab] = useState(0);
  return (
    <section className="panel tabbed-panel" aria-label={label}>
      <div className="panel-tabs" role="tablist">
        {tabs.map((t, i) => (
          <button key={t} role="tab" aria-selected={tab === i} className={`panel-tab${tab === i ? ' is-on' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>
      <div className="panel-body" role="tabpanel">
        {children(tab)}
      </div>
    </section>
  );
}

/** What the line that just ran did: tactic, headline, facts. Shared with the full-screen rail. */
export function Explanation({ frame }: { frame: Frame }) {
  const e = frame.explanation;
  const step = frame.step;
  if (!e || !step) return null;
  return (
    <div className={`explain${step.error ? ' is-error' : ''}`}>
      <h3 className="explain-tactic">{step.tactic}</h3>
      <p className="explain-headline">{rich(e.headline)}</p>
      <ul className="explain-facts">
        {e.facts.map((f, i) => (
          <li key={i}>{rich(f)}</li>
        ))}
      </ul>
    </div>
  );
}

export function GoalPanels({ frame }: { frame: Frame | undefined }) {
  return (
    <Tabbed label="Goals" tabs={['Goal State', 'Local Context']}>
      {(tab) => (!frame ? <p className="view-empty">Run the file to see its goals.</p> : tab === 0 ? <GoalState frame={frame} /> : <GoalPanel frame={frame} />)}
    </Tabbed>
  );
}

export function InfoPanels({ frame }: { frame: Frame | undefined }) {
  return (
    <Tabbed label="Explanation" tabs={['Explanation', 'Tactic Info']}>
      {(tab) => {
        const e = frame?.explanation;
        const step = frame?.step;
        if (!frame || !e || !step) {
          return <p className="view-empty">{frame ? 'Press → to run the first line.' : 'Run the file to see each step explained.'}</p>;
        }
        if (tab === 0) return <Explanation frame={frame} />;
        const d = frame.diff;
        return (
          <dl className="tactic-info">
            <div>
              <dt>Line {step.range.line}</dt>
              <dd>
                <code>{step.text}</code>
              </dd>
            </div>
            <div>
              <dt>Tactic</dt>
              <dd>
                <code>{step.tactic}</code> · {rich(e.about)}
              </dd>
            </div>
            {d && d.usedHyps.length > 0 && (
              <div>
                <dt>Uses</dt>
                <dd>{d.usedHyps.map((h) => h.name).join(', ')} (mentioned by name)</dd>
              </div>
            )}
            {d && (
              <div>
                <dt>Goals</dt>
                <dd>
                  {d.opened.length} opened · {d.proved.length} closed · {frame.remaining} remaining
                </dd>
              </div>
            )}
          </dl>
        );
      }}
    </Tabbed>
  );
}
