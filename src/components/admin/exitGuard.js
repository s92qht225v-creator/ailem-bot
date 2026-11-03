import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Lets an admin section veto leaving it (sidebar navigation, dashboard
 * shortcuts, logout) — e.g. when it holds unsaved changes. Browser-level exits
 * (reload, closing the tab) are covered separately with `beforeunload`.
 */
export const AdminExitGuardContext = createContext(null);

export const createExitGuardRegistry = () => {
  const guards = new Set();
  return {
    register(guard) {
      guards.add(guard);
      return () => guards.delete(guard);
    },
    // Resolves true when every registered guard allows leaving
    async canLeave() {
      for (const guard of [...guards]) {
        if (!(await guard())) return false;
      }
      return true;
    }
  };
};

// Register `guard` (() => boolean | Promise<boolean>) while the component is mounted
export const useAdminExitGuard = (guard) => {
  const registry = useContext(AdminExitGuardContext);
  const guardRef = useRef(guard);
  guardRef.current = guard;

  useEffect(() => {
    if (!registry) return undefined;
    return registry.register(() => guardRef.current());
  }, [registry]);
};

const HISTORY_MARK = '__adminUnsavedGuard';

/**
 * Browser-level exits while `active` (unsaved work):
 *  - reload / close tab / typing a URL → `beforeunload` (native prompt)
 *  - Back (and other history traversal) → a sentinel history entry for the
 *    same URL is pushed; pressing Back pops it, we ask `askToLeave()`, and
 *    either really go back (confirmed) or push the sentinel again (cancelled:
 *    route and component state are untouched).
 * The sentinel copies the current history.state, so Next.js's App Router
 * treats moving between it and the real entry as staying on the same page.
 * When `active` turns false the sentinel is removed again.
 */
export const useBrowserExitGuard = (active, askToLeave) => {
  const askRef = useRef(askToLeave);
  askRef.current = askToLeave;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const { history } = window;
    let leaving = false;
    let asking = false;

    const pushSentinel = () => history.pushState({ ...(history.state || {}), [HISTORY_MARK]: true }, '');
    pushSentinel();

    const onBeforeUnload = (e) => {
      if (leaving) return;
      e.preventDefault();
      e.returnValue = '';
    };

    const onPopState = async () => {
      if (leaving || asking) return;
      // Moving onto our sentinel (e.g. Forward) is not an exit
      if (history.state?.[HISTORY_MARK]) return;
      asking = true;
      let ok = false;
      try {
        ok = await askRef.current();
      } finally {
        asking = false;
      }
      if (ok) {
        leaving = true;
        history.back();
      } else {
        pushSentinel();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      // Work saved/discarded while still on the page: drop our sentinel
      if (!leaving && history.state?.[HISTORY_MARK]) history.back();
    };
  }, [active]);
};
