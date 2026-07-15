import { useCallback } from "react";
import {
  getLocale,
  translate,
  translateError,
  translateExternalMessage,
  type MessageKey,
  type TranslationParams,
} from "../i18n";
import { useLanguageStore } from "../state/languageStore";

export function useI18n() {
  const language = useLanguageStore((state) => state.language);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);

  const t = useCallback(
    (key: MessageKey, params?: TranslationParams) => translate(language, key, params),
    [language],
  );
  const localizeError = useCallback(
    (error: unknown, fallbackKey: MessageKey) => translateError(language, error, fallbackKey),
    [language],
  );
  const localizeExternalMessage = useCallback(
    (message: string | null | undefined, fallbackKey: MessageKey) =>
      translateExternalMessage(language, message, fallbackKey),
    [language],
  );

  return {
    language,
    locale: getLocale(language),
    toggleLanguage,
    t,
    localizeError,
    localizeExternalMessage,
  };
}
