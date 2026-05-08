import { ERROR_MESSAGES } from './errors';
import { SUCCESS_MESSAGES } from './success';

export const MESSAGES = {
  ...SUCCESS_MESSAGES,
  ...ERROR_MESSAGES,
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function isMessageKey(value: string): value is MessageKey {
  return value in MESSAGES;
}

export function getMessage(key: MessageKey): string {
  return MESSAGES[key];
}

export function resolveMessage(codeOrMessage: string): { code?: MessageKey; message: string } {
  if (isMessageKey(codeOrMessage)) {
    return {
      code: codeOrMessage,
      message: getMessage(codeOrMessage),
    };
  }

  return {
    message: codeOrMessage,
  };
}
