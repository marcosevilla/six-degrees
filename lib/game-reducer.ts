import { GameState, GameAction } from "./types";

export const initialGameState: GameState = {
  phase: "home",
  difficulty: null,
  actorPair: null,
  par: null,
  chain: [],
  searchMode: "media",
  selectedMedia: null,
  startTime: null,
  endTime: null,
  pausedMs: 0,
  pauseStartedAt: null,
  hintsUsed: 0,
  hintFilms: null,
  hintLink: null,
  closing: false,
  bestRoute: null,
  endReason: null,
};

// Every case guards its phase and returns the same state object when an action
// makes no sense right now, so stray clicks and late network replies can't put
// the game into an impossible state.

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BEGIN_REVEAL":
      if (state.phase !== "home" && state.phase !== "results") return state;
      return { ...initialGameState, phase: "revealing", difficulty: action.difficulty };

    case "START_GAME":
      if (state.phase !== "revealing") return state;
      return {
        ...initialGameState,
        phase: "playing",
        difficulty: action.difficulty,
        actorPair: action.pair,
        par: action.par,
        chain: [
          {
            type: "actor",
            id: action.pair.start.id,
            name: action.pair.start.name,
            profilePath: action.pair.start.profilePath ?? null,
          },
        ],
        startTime: action.now,
      };

    case "SELECT_MEDIA":
      return {
        ...state,
        chain: [
          ...state.chain,
          {
            type: "media",
            id: action.media.id,
            name: action.media.title,
            mediaType: action.media.mediaType,
            posterPath: action.media.posterPath,
          },
        ],
        searchMode: "person",
        selectedMedia: action.media,
      };

    case "SELECT_PERSON": {
      const isTarget =
        state.actorPair && action.person.id === state.actorPair.end.id;

      const newChain = [
        ...state.chain,
        {
          type: "actor" as const,
          id: action.person.id,
          name: action.person.name,
          profilePath: action.person.profilePath,
        },
      ];

      if (isTarget) {
        return {
          ...state,
          chain: newChain,
          phase: "results",
          endTime: Date.now(),
          searchMode: "media",
          selectedMedia: null,
        };
      }

      return {
        ...state,
        chain: newChain,
        searchMode: "media",
        selectedMedia: null,
      };
    }

    case "UNDO_LAST": {
      if (state.chain.length <= 1) return state;

      const newChain = state.chain.slice(0, -1);
      const lastLink = newChain[newChain.length - 1];
      const newSearchMode = lastLink.type === "actor" ? "media" : "person";
      const newSelectedMedia =
        newSearchMode === "person" && lastLink.type === "media"
          ? {
              id: lastLink.id,
              title: lastLink.name,
              year: "",
              posterPath: lastLink.posterPath ?? null,
              mediaType: lastLink.mediaType!,
            }
          : null;

      return {
        ...state,
        chain: newChain,
        searchMode: newSearchMode,
        selectedMedia: newSelectedMedia,
      };
    }

    case "RESET_CHAIN":
      return {
        ...state,
        chain: [state.chain[0]],
        searchMode: "media",
        selectedMedia: null,
      };

    case "PAUSE_TIMER":
      if (state.phase !== "playing" || state.pauseStartedAt !== null) return state;
      return { ...state, pauseStartedAt: action.now };

    case "RESUME_TIMER":
      if (state.pauseStartedAt === null) return state;
      return {
        ...state,
        pausedMs: state.pausedMs + Math.max(0, action.now - state.pauseStartedAt),
        pauseStartedAt: null,
      };

    case "PLAY_AGAIN":
      return initialGameState;

    default:
      return state;
  }
}
