import type { ConsoleLevel, SerializedValue } from '../../types/runtime';

/**
 * Preview iframe -> host messages.
 *
 * The iframe has an opaque origin, so `event.origin` arrives as "null" and is
 * useless for validation. The host instead checks that the message came from
 * the exact contentWindow it created, carries this channel tag, and belongs to
 * the run that is currently active.
 */
export const PREVIEW_CHANNEL = 'js-practice/react-preview';

export type PreviewOutbound =
  | { channel: typeof PREVIEW_CHANNEL; runId: number; type: 'console'; level: ConsoleLevel; args: SerializedValue[] }
  | { channel: typeof PREVIEW_CHANNEL; runId: number; type: 'error'; message: string; stack?: string }
  /** Posted once the user's module has been evaluated and render was kicked off. */
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
