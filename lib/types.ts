// TMDb API response types

export interface TMDbMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
}

export interface TMDbTVShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
}

export interface TMDbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
}

export interface TMDbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

// Normalized types used in the game

export interface MediaResult {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
  mediaType: "movie" | "tv";
}

export interface PersonResult {
  id: number;
  name: string;
  profilePath: string | null;
}

// Actor in the curated pool
export interface PoolActor {
  id: number;
  name: string;
  profilePath?: string | null;
}

// Game types

export interface ChainLink {
  type: "actor" | "media";
  id: number;
  name: string;
  mediaType?: "movie" | "tv";
  year?: string;
  profilePath?: string | null;
  posterPath?: string | null;
}

export type SearchMode = "media" | "person";

export type GamePhase = "home" | "revealing" | "playing" | "results";

// Difficulty is a par band: easy = par 1 (they share a title), medium = par 2.
// There is no hard mode: with the famous pool only 0.03% of pairs are par 3+.
export type Difficulty = "easy" | "medium";

export interface ActorPair {
  start: PoolActor;
  end: PoolActor;
}

export type EndReason = "won" | "gaveUp";

// Hint rung 1 for one actor: their five best-known titles.
export interface HintFilms {
  actorId: number;
  films: MediaResult[];
}

// Hint rung 2+ for one actor: the next title and actor on the best route.
export interface HintLink {
  actorId: number;
  links: ChainLink[];
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty | null;
  actorPair: ActorPair | null;
  par: number | null;
  chain: ChainLink[];
  searchMode: SearchMode;
  selectedMedia: MediaResult | null;
  startTime: number | null;
  endTime: number | null;
  // Time spent waiting on validation doesn't count against the player.
  pausedMs: number;
  pauseStartedAt: number | null;
  hintsUsed: number;
  hintFilms: HintFilms | null;
  hintLink: HintLink | null;
  // The target was tapped and the close-the-chain beat is playing.
  closing: boolean;
  bestRoute: ChainLink[] | null;
  endReason: EndReason | null;
}

// Actions that touch time carry `now` so the reducer stays pure and testable.
export type GameAction =
  | { type: "BEGIN_REVEAL"; difficulty: Difficulty }
  | { type: "START_GAME"; pair: ActorPair; difficulty: Difficulty; par: number; now: number }
  // Picks name what they were validated against, so a reply that arrives after
  // Start over / Undo can't add a link checked against someone else.
  | { type: "SELECT_MEDIA"; media: MediaResult; fromActorId: number }
  | { type: "SELECT_PERSON"; person: PersonResult; mediaId: number }
  | { type: "UNDO_LAST" }
  | { type: "RESET_CHAIN"; now: number }
  | { type: "PAUSE_TIMER"; now: number }
  | { type: "RESUME_TIMER"; now: number }
  | { type: "USE_HINT_FILMS"; actorId: number; films: MediaResult[] }
  | { type: "USE_HINT_LINK"; actorId: number; links: ChainLink[] }
  | { type: "CLOSE_CHAIN"; now: number; mediaId: number }
  | { type: "FINISH"; bestRoute: ChainLink[] | null }
  | { type: "GIVE_UP"; bestRoute: ChainLink[] | null; now: number }
  | { type: "PLAY_AGAIN" };
