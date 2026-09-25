// The one rulebook for what counts as a connection. Everything that decides
// whether two people share a title (the costar graph build, the route bridge,
// validate for gameplay, search for what players can pick) goes through these
// helpers, so par and play can never disagree.

export const TMDB_BASE = "https://api.themoviedb.org/3";

export type MediaType = "movie" | "tv";

// Documentary, News, Reality, Talk. Nearly every famous actor has sat on
// Kimmel, and documentaries are mostly "Self" interviews and archive clips, so
// allowing any of these links almost any pair in one step. Documentaries also
// go because the few real roles in them (narrators) aren't co-starring.
export const EXCLUDED_GENRES = new Set([99, 10763, 10764, 10767]);

// Awards shows can't be caught by genre: TMDb lists The Oscars with no genres
// at all. Everyone on them is credited as "Self", "Self - Presenter" or "Host",
// so the character check below is what closes that door. Archive-footage
// compilations (Final Cut: Ladies and Gentlemen credits every actor it clips)
// are caught the same way.
const NON_ACTING_CHARACTER =
  /\b(self|himself|herself|themselves)\b|archive|^\s*host\b/i;

export interface CreditEntry {
  id: number;
  media_type?: string;
  vote_count?: number;
  character?: string;
  genre_ids?: number[];
}

// A cast member from /movie/{id}/credits (character) or
// /tv/{id}/aggregate_credits (roles across every season).
export interface CastMember {
  id: number;
  character?: string;
  roles?: { character?: string }[];
}

// Search can't see who's credited as "Self", so ungenred awards ceremonies
// would still show up as pickable titles. They are all TV broadcasts, so the
// name check only runs on TV, where it can't catch a feature film.
const AWARDS_SHOW_TITLE =
  /\b(awards?|oscars|academy awards|golden globes?|emmys|grammys|tony awards|baftas?)\b/i;

export function isEligibleTitle(genreIds: readonly number[] | undefined): boolean {
  return !(genreIds ?? []).some((g) => EXCLUDED_GENRES.has(g));
}

export function isAwardsShow(mediaType: MediaType, title: string | undefined): boolean {
  return mediaType === "tv" && AWARDS_SHOW_TITLE.test(title ?? "");
}

export function isActingCharacter(character: string | undefined): boolean {
  return !NON_ACTING_CHARACTER.test(character ?? "");
}

// For an entry in a person's combined_credits.
export function isActingRole(c: CreditEntry): boolean {
  return isActingCharacter(c.character) && isEligibleTitle(c.genre_ids);
}

// For a member of a title's cast list. On TV an actor counts if any of their
// roles across the series is a real performance.
export function castMemberActs(member: CastMember): boolean {
  if (member.roles && member.roles.length > 0) {
    return member.roles.some((r) => isActingCharacter(r.character));
  }
  return isActingCharacter(member.character);
}

// TMDb numbers movies and TV separately, so the same integer can mean two
// different titles (movie 2034 = Training Day, tv 2034 = Drive). Always key
// credits on both fields or unrelated actors look like co-stars.
export const creditKey = (c: CreditEntry) => `${c.media_type ?? "movie"}:${c.id}`;

// combined_credits comes back roughly chronological, so the head of the list is
// an actor's earliest and most obscure work. Sort by vote_count first so any
// sample lands on the mainstream titles players actually know.
export const byReach = (a: CreditEntry, b: CreditEntry) =>
  (b.vote_count ?? 0) - (a.vote_count ?? 0);

// TV uses aggregate_credits so the whole run's cast counts, not just the
// latest season. Every route builds cast URLs through this so they agree.
export function castPath(mediaType: MediaType, id: number | string): string {
  return mediaType === "tv"
    ? `/tv/${id}/aggregate_credits`
    : `/movie/${id}/credits`;
}

export function toMediaType(value: string | null | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}
