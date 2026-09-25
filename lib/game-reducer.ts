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
      if (state.phase !== "playing" || state.closing || state.searchMode !== "media") return state;
      if (state.chain.at(-1)?.id !== action.fromActorId) return state; // stale validation reply
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
        // A link hint named a route through some other title (or none).
        hintLink: null,
      };

    case "SELECT_PERSON": {
      if (state.phase !== "playing" || state.closing || state.searchMode !== "person") return state;
      if (state.selectedMedia?.id !== action.mediaId) return state; // stale validation reply
      // Reaching the target is CLOSE_CHAIN's job (the tap-to-close beat).
      if (state.actorPair && action.person.id === state.actorPair.end.id) return state;
      return {
        ...state,
        chain: [
          ...state.chain,
          {
            type: "actor" as const,
            id: action.person.id,
            name: action.person.name,
            profilePath: action.person.profilePath,
          },
        ],
        searchMode: "media",
        selectedMedia: null,
        // New current actor: their hint ladder starts fresh.
        hintFilms: null,
        hintLink: null,
      };
    }

    case "UNDO_LAST": {
      if (state.phase !== "playing" || state.closing || state.chain.length <= 1) return state;

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

      const removedActor = state.chain[state.chain.length - 1].type === "actor";
      return {
        ...state,
        chain: newChain,
        searchMode: newSearchMode,
        selectedMedia: newSelectedMedia,
        // Removing an actor changes who we're working from; removing a film
        // makes any link hint through it stale.
        hintLink: null,
        ...(removedActor ? { hintFilms: null } : {}),
      };
    }

    // Start over is a fresh attempt at the same pair: new clock, but hints
    // already taken still count.
    case "RESET_CHAIN":
      if (state.phase !== "playing" || state.closing) return state;
      return {
        ...state,
        chain: [state.chain[0]],
        searchMode: "media",
        selectedMedia: null,
        startTime: action.now,
        pausedMs: 0,
        pauseStartedAt: null,
        hintFilms: null,
        hintLink: null,
      };

    case "USE_HINT_FILMS":
      if (state.phase !== "playing" || state.closing) return state;
      return {
        ...state,
        hintsUsed: state.hintsUsed + 1,
        hintFilms: { actorId: action.actorId, films: action.films },
      };

    case "USE_HINT_LINK":
      if (state.phase !== "playing" || state.closing) return state;
      return {
        ...state,
        hintsUsed: state.hintsUsed + 1,
        hintLink: { actorId: action.actorId, links: action.links },
      };

    case "GIVE_UP": {
      if (state.phase !== "playing" || state.closing) return state;
      const openPause = state.pauseStartedAt !== null ? Math.max(0, action.now - state.pauseStartedAt) : 0;
      return {
        ...state,
        phase: "results",
        endReason: "gaveUp",
        endTime: action.now,
        pausedMs: state.pausedMs + openPause,
        pauseStartedAt: null,
        bestRoute: action.bestRoute,
        searchMode: "media",
        selectedMedia: null,
      };
    }

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

    // The player tapped the target: the chain is complete. Stay on the playing
    // screen for the close-the-chain beat; FINISH moves to results after it.
    case "CLOSE_CHAIN": {
      if (
        state.phase !== "playing" ||
        state.closing ||
        state.searchMode !== "person" ||
        !state.actorPair ||
        state.selectedMedia?.id !== action.mediaId
      ) {
        return state;
      }
      const target = state.actorPair.end;
      const openPause = state.pauseStartedAt !== null ? Math.max(0, action.now - state.pauseStartedAt) : 0;
      return {
        ...state,
        chain: [...state.chain, { type: "actor", id: target.id, name: target.name, profilePath: target.profilePath ?? null }],
        closing: true,
        endTime: action.now,
        pausedMs: state.pausedMs + openPause,
        pauseStartedAt: null,
        searchMode: "media",
        selectedMedia: null,
        hintFilms: null,
        hintLink: null,
      };
    }

    case "FINISH":
      if (!state.closing) return state;
      return { ...state, phase: "results", closing: false, endReason: "won", bestRoute: action.bestRoute };

    case "PLAY_AGAIN":
      return initialGameState;

    default:
      return state;
  }
}
