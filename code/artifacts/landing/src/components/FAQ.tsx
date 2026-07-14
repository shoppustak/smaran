import { useLanguage } from "@/context/LanguageContext";
import { Plus } from "lucide-react";

export function FAQ() {
  const { content } = useLanguage();

  return (
    <section className="bg-background pt-4 pb-12 md:pt-6 md:pb-16 px-6">
      <div className="mx-auto max-w-3xl">
        
        {/* Eyebrow Title matching "OUR WORD" */}
        <div className="mb-10 text-center">
          <span className="fs-eyebrow tracking-[0.08em] uppercase text-text-secondary font-semibold">
            {content.faq.heading}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {content.faq.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-lg border border-border bg-white p-5 shadow-card transition-all duration-200 hover:border-border/80 open:border-border/80"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground fs-body focus:outline-none select-none">
                <span>{item.question}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground transition-transform duration-250 group-open:rotate-45">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="mt-4 fs-body leading-[1.6] text-text-secondary border-t border-border pt-4">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

      </div>
    </section>
  );
}
