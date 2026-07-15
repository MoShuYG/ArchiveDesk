import { create } from "zustand";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type Language,
} from "../i18n";

interface LanguageState {
  language: Language;
  initLanguage: () => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: readSavedLanguage(),

  initLanguage() {
    const language = readSavedLanguage();
    set({ language });
    applyLanguage(language);
  },

  setLanguage(language) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Keep the in-memory preference when browser storage is unavailable.
      }
    }
    set({ language });
    applyLanguage(language);
  },

  toggleLanguage() {
    get().setLanguage(get().language === "zh-CN" ? "en-US" : "zh-CN");
  },
}));

function readSavedLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function applyLanguage(language: Language): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}
