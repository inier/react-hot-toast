import { useEffect, useMemo } from 'react';
import { dispatch, ActionType, useStore } from './store';
import { DefaultToastOptions, ToastType } from './types';

const defaultTimeouts: Map<ToastType, number> = new Map<ToastType, number>([
  ['blank', 4000],
  ['error', 4000],
  ['success', 2000],
  ['loading', 30000],
]);

export const useToaster = (toastOptions?: DefaultToastOptions) => {
  const { toasts, pausedAt } = useStore();
  const visibleToasts = toasts.filter((t) => t.visible);

  useEffect(() => {
    if (pausedAt) {
      return;
    }

    const now = Date.now();
    const timeouts = toasts.map((t) => {
      const duration =
        t.duration ||
        toastOptions?.[t.type]?.duration ||
        toastOptions?.duration ||
        defaultTimeouts.get(t.type) ||
        4000;
      const durationLeft = duration + t.pauseDuration - (now - t.createdAt);

      const dismiss = () => {
        dispatch({
          type: ActionType.DISMISS_TOAST,
          toastId: t.id,
        });
        setTimeout(() => {
          dispatch({
            type: ActionType.REMOVE_TOAST,
            toastId: t.id,
          });
        }, 1000);
      };

      if (durationLeft < 0) {
        if (t.visible) {
          dismiss();
        }
        return;
      }
      return setTimeout(dismiss, durationLeft);
    });

    return () => {
      timeouts.forEach((timeout) => timeout && clearTimeout(timeout));
    };
  }, [toasts, pausedAt]);

  const handlers = useMemo(
    () => ({
      startPause: () => {
        dispatch({
          type: ActionType.START_PAUSE,
          time: Date.now(),
        });
      },
      endPause: () => {
        if (pausedAt) {
          dispatch({ type: ActionType.END_PAUSE, time: Date.now() });
        }
      },
      updateHeight: (toastId: string, height: number) =>
        dispatch({
          type: ActionType.UPDATE_TOAST,
          toast: { id: toastId, height },
        }),
      calculateOffset: (
        toastId: string,
        opts?: { reverseOrder?: boolean; margin?: number }
      ) => {
        const { reverseOrder = false, margin = 8 } = opts || {};
        const index = visibleToasts.findIndex((toast) => toast.id === toastId);
        const offset =
          index !== -1
            ? visibleToasts
                .slice(...(reverseOrder ? [index + 1] : [0, index]))
                .reduce((acc, t) => acc + (t.height || 0) + margin, 0)
            : 0;

        return offset;
      },
    }),
    [visibleToasts, pausedAt]
  );

  return {
    toasts,
    visibleToasts,
    handlers,
  };
};
