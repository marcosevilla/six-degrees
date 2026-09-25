import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react auto-detects the React version through an API ESLint 10
  // removed (context.getFilename), which crashes the run. Pinning it skips that.
  { settings: { react: { version: "19.2" } } },
  {
    // Existing components set state inside effects in 4 places (ChainBuilder,
    // SearchInput, RevealScreen, play page). It's a render-performance smell,
    // not a bug, and fixing it means touching gameplay UI, so it's tracked as
    // a warning until the core-loop rebuild rewrites those components.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    // Dev scripts parse untyped TMDb and API JSON; typing every response shape
    // adds noise without catching anything.
    files: ["scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
