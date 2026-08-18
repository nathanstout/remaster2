import type { ConsoleLevel, SerializedValue } from '../../../types/runtime';

/**
 * Preview iframe -> host messages, shared by every iframe-backed runtime.
 *
 * A preview iframe has an opaque origin, so `event.origin` arrives as "null"
 * and is useless for validation. The host instead checks that a message came
 * from the exact contentWindow it created, carries this channel tag, and
 * belongs to the run that is currently active.
 */
export const PREVIEW_CHANNEL = 'js-practice/preview';

export type PreviewOutbound =
  | {
      channel: typeof PREVIEW_CHANNEL;
      runId: number;
      type: 'console';
      level: ConsoleLevel;
      args: SerializedValue[];
    }
  | { channel: typeof PREVIEW_CHANNEL; runId: number; type: 'error'; message: string; stack?: string }
  /** Posted once the preview's own bootstrap finished. The frame stays alive. */
  | { channel: typeof PREVIEW_CHANNEL; runId: number; type: 'ready' };

export function isPreviewMessage(data: unknown): data is PreviewOutbound {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Partial<PreviewOutbound>;
  return (
    message.channel === PREVIEW_CHANNEL &&
    typeof message.runId === 'number' &&
    (message.type === 'console' || message.type === 'error' || message.type === 'ready')
  );
}
