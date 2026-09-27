import type { Route } from "@/lib/solver/types";
import type { ChainLink } from "@/lib/types";

export function routeToLinks(route: Route): ChainLink[] {
  return route.steps.map((s) =>
    s.kind === "actor"
      ? { type: "actor", id: s.id, name: s.name }
      : { type: "media", id: s.id, name: s.name, mediaType: s.mediaType, year: s.year },
  );
}
