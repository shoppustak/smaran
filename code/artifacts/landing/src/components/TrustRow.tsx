import { useLanguage } from "@/context/LanguageContext";

export function TrustRow() {
  const { content } = useLanguage();
  const { trust } = content;

  return (
    <section className="bg-muted py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center font-serif text-2xl font-medium text-foreground">
          {trust.heading}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {trust.statements.map((statement) => (
            <li
              key={statement}
              className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-foreground shadow-sm"
            >
              {statement}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
