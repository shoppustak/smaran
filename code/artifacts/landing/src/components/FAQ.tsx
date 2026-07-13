import { useLanguage } from "@/context/LanguageContext";

export function FAQ() {
  const { content } = useLanguage();

  return (
    <section className="bg-primary/5 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center font-serif text-2xl font-medium text-foreground">
          {content.faq.heading}
        </h2>
        <div className="flex flex-col gap-3">
          {content.faq.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl bg-card p-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                {item.question}
                <span className="shrink-0 text-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
