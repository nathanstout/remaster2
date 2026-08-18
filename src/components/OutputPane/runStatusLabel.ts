import type { RunStatus } from '../../hooks/useRuntime';

/** Human-readable label for the playground run status shown in the pane header. */
export const STATUS_LABEL: Record<RunStatus, string> = {
  idle: 'idle',
  running: 'running…',
  finished: 'finished',
  timeout: 'terminated',
  error: 'error',
};
