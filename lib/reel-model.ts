import type { ChainLink, PoolActor } from "./types";

// Film stock colors (CSS variables), one per film in this order. Amber comes
// last: it is also the "tap to connect" highlight, so a short line never has an
// amber strip that reads as already linked to a ready target.
export const STOCKS = ["--color-stock-blue", "--color-stock-red", "--color-stock-green", "--color-stock-amber"];

export interface StationModel {
  key: string;
  name: string;
  profilePath?: string | null;
  role: "start" | "actor" | "target";
}

export interface FilmModel {
  key: string;
  link: ChainLink;
  from: string;
  to: string | null;
  stock: number; // index into STOCKS
}

// Actors are reels (stations); each film hangs from the actor before it to the
// actor after it, or dangles while the player looks for who else was in it.
// Once the chain closes, the target is the last link and the last film's far end.
export function buildModel(chain: ChainLink[], target: PoolActor) {
  const stations: StationModel[] = [];
  const films: FilmModel[] = [];
  let last = "";
  chain.forEach((link, i) => {
    if (link.type === "actor") {
      const isTarget = link.id === target.id && i === chain.length - 1 && i > 0;
      const key = isTarget ? "target" : `a${i}-${link.id}`;
      if (!isTarget) stations.push({ key, name: link.name, profilePath: link.profilePath, role: i === 0 ? "start" : "actor" });
      const open = films.at(-1);
      if (open && open.to === null) open.to = key;
      last = key;
    } else {
      films.push({ key: `f${i}-${link.id}`, link, from: last, to: null, stock: films.length % STOCKS.length });
    }
  });
  stations.push({ key: "target", name: target.name, profilePath: target.profilePath, role: "target" });
  return { stations, films };
}
