import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

export const AutoUpdateBanner: React.FC = () => {
  const { canAutoReloadSafely } = useApp();
  const [updateVisible, setUpdateVisible] = useState(false);
  const updateInProgressRef = useRef(false);
  const initialVersionRef = useRef<string | null>(null);
  const safeCheckRef = useRef(canAutoReloadSafely);

  useEffect(() => {
    safeCheckRef.current = canAutoReloadSafely;
  }, [canAutoReloadSafely]);

  useEffect(() => {
    let registrationRef: ServiceWorkerRegistration | null = null;
    let pollTimer: number | null = null;
    let retryTimer: number | null = null;

    const triggerUpdate = (waitingWorker?: ServiceWorker | null) => {
      if (updateInProgressRef.current) return;
      if (!safeCheckRef.current()) {
        if (retryTimer) window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          triggerUpdate(waitingWorker);
        }, 4000);
        return;
      }

      updateInProgressRef.current = true;
      setUpdateVisible(true);

      if (waitingWorker) {
        try {
          waitingWorker.postMessage({ type: 'AE_SKIP_WAITING' });
        } catch {
          // ignore
        }
      }

      window.setTimeout(() => {
        window.location.reload();
      }, 2400);
    };

    const checkAppShellVersion = async () => {
      if (
        !navigator.onLine ||
        updateInProgressRef.current ||
        window.location.protocol === 'file:'
      ) {
        return;
      }
      try {
        const res = await fetch('/index.html', {
          method: 'HEAD',
          cache: 'no-store',
        });
        const sig =
          res.headers.get('etag') || res.headers.get('last-modified') || '';
        if (!sig) return;
        if (!initialVersionRef.current) {
          initialVersionRef.current = sig;
        } else if (sig !== initialVersionRef.current) {
          triggerUpdate(registrationRef?.waiting);
        }
      } catch {
        // ignore network hiccups
      }
    };

    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      if (import.meta.env.DEV) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => {
              r.unregister().catch(() => {});
            });
          })
          .catch(() => {});
        if ('caches' in window) {
          caches
            .keys()
            .then((keys) => {
              keys
                .filter((k) => k.startsWith('associate-engineers-'))
                .forEach((k) => {
                  caches.delete(k).catch(() => {});
                });
            })
            .catch(() => {});
        }
      } else {
        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((reg) => {
            registrationRef = reg;
            if (reg.waiting) {
              triggerUpdate(reg.waiting);
            }
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  triggerUpdate(newWorker);
                }
              });
            });
            reg.update().catch(() => {});
          })
          .catch(() => {});

        const onControllerChange = () => {
          if (updateInProgressRef.current) {
            window.location.reload();
          }
        };
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          onControllerChange
        );
      }
    }

    if (!import.meta.env.DEV) {
      checkAppShellVersion();
      pollTimer = window.setInterval(() => {
        registrationRef?.update().catch(() => {});
        checkAppShellVersion();
      }, 60000);
    }

    const onOnline = () => {
      if (!import.meta.env.DEV) {
        registrationRef?.update().catch(() => {});
        checkAppShellVersion();
      }
    };
    window.addEventListener('online', onOnline);

    return () => {
      if (pollTimer) window.clearInterval(pollTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!updateVisible) return null;

  return (
    <div id="ae-auto-update-notice" role="status" aria-live="polite">
      <div className="ae-update-card">
        <div className="ae-update-icon">
          <i className="fa-solid fa-arrows-rotate fa-spin" />
        </div>
        <div className="ae-update-copy">
          <strong>Update Available</strong>
          <span>Updating workspace to the latest version…</span>
          <div className="ae-update-progress">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
};
