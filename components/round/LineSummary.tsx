import type { ChainLink } from "@/lib/types";
import { STOCKS } from "@/lib/reel-model";

// A route drawn small and vertical: a reel per actor, a strip of film per
// title in its stock color. The express line runs in reel aluminum.
export function LineSummary({
  title,
  links,
  express = false,
  emptyText,
}: {
  title: string;
  links: ChainLink[] | null;
  express?: boolean;
  emptyText: string;
}) {
  let film = 0;
  return (
    <section className="flex flex-col gap-2 min-w-0">
      <h2 className="text-sm text-text-secondary">{title}</h2>
      {links && links.length > 0 ? (
        <ol className="grid grid-cols-[22px_1fr] gap-x-2.5 gap-y-0.5" aria-label={title}>
          {links.map((link, i) => {
            const key = `${link.type}-${link.id}-${i}`;
            if (link.type === "actor") {
              return (
                <li key={key} className="contents">
                  <MiniReel />
                  <span className="text-sm font-extrabold self-center leading-tight py-0.5">{link.name}</span>
                </li>
              );
            }
            const stock = express ? "var(--color-reel)" : `var(${STOCKS[film++ % STOCKS.length]})`;
            return (
              <li key={key} className="contents">
                <span className="mini-strip justify-self-center" style={{ "--c": stock } as React.CSSProperties} aria-hidden="true" />
                <span className="text-xs text-text-secondary self-center leading-snug">
                  {link.name}{" "}
                  {link.year && <span className="font-mono">{link.year}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-text-secondary">{emptyText}</p>
      )}
    </section>
  );
}

function MiniReel() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="w-[18px] h-[18px] justify-self-center self-center">
      <circle cx="32" cy="32" r="31" fill="var(--color-reel)" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return <circle key={i} cx={32 + 21 * Math.cos(a)} cy={32 + 21 * Math.sin(a)} r="6" fill="var(--color-bg)" />;
      })}
    </svg>
  );
}
