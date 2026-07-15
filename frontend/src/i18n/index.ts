import {
  enMessages,
  errorCodeKeys,
  externalMessageKeys,
  zhMessages,
  type MessageKey,
} from "./messages";

export type Language = "zh-CN" | "en-US";
export type TranslationParams = Readonly<Record<string, string | number>>;
export type LocalizedError = { value: unknown; fallbackKey: MessageKey };

export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const LANGUAGE_STORAGE_KEY = "archivedesk-language";
export const messages = { "zh-CN": zhMessages, "en-US": enMessages } as const;

export function normalizeLanguage(value: unknown): Language {
  return value === "en-US" || value === "en" ? "en-US" : DEFAULT_LANGUAGE;
}

export function getLocale(language: Language): Language {
  return language;
}

export function translate(
  language: Language,
  key: MessageKey,
  params: TranslationParams = {},
): string {
  const template = messages[language][key];
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
}

export function translateExternalMessage(
  language: Language,
  message: string | null | undefined,
  fallbackKey: MessageKey,
): string {
  const normalizedMessage = message?.trim();
  if (!normalizedMessage) return translate(language, fallbackKey);

  const knownKey = externalMessageKeys[normalizedMessage];
  if (knownKey) return translate(language, knownKey);

  if (language === "zh-CN") {
    return containsHan(normalizedMessage) ? normalizedMessage : translate(language, fallbackKey);
  }

  return containsHan(normalizedMessage) ? translate(language, fallbackKey) : normalizedMessage;
}

export function translateError(
  language: Language,
  error: unknown,
  fallbackKey: MessageKey,
): string {
  const errorLike = asErrorLike(error);
  if (errorLike?.code) {
    const codeKey = errorCodeKeys[errorLike.code];
    const exactKey = errorLike.message ? externalMessageKeys[errorLike.message.trim()] : undefined;
    if (exactKey) return translate(language, exactKey);
    if (language === "zh-CN" && errorLike.message && containsHan(errorLike.message)) {
      return errorLike.message;
    }
    if (codeKey) return translate(language, codeKey);
  }

  return translateExternalMessage(language, errorLike?.message, fallbackKey);
}

export type { MessageKey } from "./messages";

function containsHan(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function asErrorLike(error: unknown): { code?: string; message?: string } | null {
  if (typeof error === "string") return { message: error };
  if (!error || typeof error !== "object") return null;

  const candidate = error as { code?: unknown; message?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
  };
}
