import type { ChainLink } from "@/lib/types";

interface RouteListProps {
  title: string;
  links: ChainLink[] | null;
  emptyText?: string;
}

// A route as plain text: actors in the body style, titles in italic between
// them. The visual treatment comes later (design pass); this is the data.
export function RouteList({ title, links, emptyText = "Unavailable" }: RouteListProps) {
  return (
    <section className="flex flex-col gap-2 min-w-0">
      <h2 className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--color-text-secondary)" }}>
        {title}
      </h2>
      {links && links.length > 0 ? (
        <ol className="flex flex-col gap-1" aria-label={title}>
          {links.map((link, i) => (
            <li
              key={`${link.type}-${link.id}-${i}`}
              className={link.type === "actor" ? "text-sm" : "text-xs italic pl-3"}
              style={{ color: link.type === "actor" ? "var(--color-text)" : "var(--color-text-secondary)" }}
            >
              {link.type === "media" && <span aria-hidden="true">↳ </span>}
              {link.name}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {emptyText}
        </p>
      )}
    </section>
  );
}
