import { STORE } from '../config';

export function SplashLoader() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <div className="splash-inner">
        <span className="splash-logo brand-ltr" dir="ltr">{STORE.name}</span>
        <span className="splash-bar" />
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <span className="spinner" />
    </div>
  );
}
