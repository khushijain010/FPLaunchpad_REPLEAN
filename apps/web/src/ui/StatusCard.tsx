import { useStore } from './store';
import { Logo } from './Logo';
import { loadSample } from './loader';

export function StatusCard({ kind, title, message }: { kind: 'loading' | 'empty' | 'error'; title: string; message: string }) {
  const samples = useStore((s) => s.samples);
  return (
    <div className={`status-card is-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Logo size={36} />
      <h1>{title}</h1>
      <p>{message}</p>
      {kind === 'error' && samples.length > 0 && (
        <div className="status-actions">
          {samples.map((s) => (
            <button key={s.id} className="btn" onClick={() => void loadSample(s.id)}>
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
