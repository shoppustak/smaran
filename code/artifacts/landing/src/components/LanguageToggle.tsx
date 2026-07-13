import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle() {
  const { content, toggle } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-accent"
    >
      {content.toggleLabel}
    </button>
  );
}
