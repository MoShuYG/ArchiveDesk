import { LanguageIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../../hooks/useI18n";
import { cn } from "../../utils/cn";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, t, toggleLanguage } = useI18n();
  const isChinese = language === "zh-CN";
  const label = isChinese ? t("language.compactEnglish") : t("language.compactChinese");
  const accessibleLabel = isChinese ? t("language.switchToEnglish") : t("language.switchToChinese");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <LanguageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
