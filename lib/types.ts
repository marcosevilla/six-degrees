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
  profilePath?: string | null;
  posterPath?: string | null;
}

export type SearchMode = "media" | "person";

export type GamePhase = "home" | "playing" | "results";

export type Difficulty = "easy" | "medium" | "hard";

export interface ActorPair {
  start: PoolActor;
  end: PoolActor;
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty | null;
  actorPair: ActorPair | null;
  chain: ChainLink[];
  searchMode: SearchMode;
  selectedMedia: MediaResult | null;
  startTime: number | null;
  endTime: number | null;
}

export type GameAction =
  | { type: "START_GAME"; pair: ActorPair; difficulty: Difficulty }
  | { type: "SELECT_MEDIA"; media: MediaResult }
  | { type: "SELECT_PERSON"; person: PersonResult }
  | { type: "UNDO_LAST" }
  | { type: "RESET_CHAIN" }
  | { type: "PLAY_AGAIN" };
