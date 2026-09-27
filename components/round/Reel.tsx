import { getProfileUrl } from "@/lib/actor-pool";

// A 35mm reel: aluminum plate, six cut-outs, the actor's face at the hub.
export function ReelPlate({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle className="reel-plate" cx="32" cy="32" r="31" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        return <circle key={i} className="reel-cut" cx={32 + 21 * Math.cos(a)} cy={32 + 21 * Math.sin(a)} r="5.4" />;
      })}
      <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1" />
    </svg>
  );
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

export function ReelFace({ name, profilePath }: { name: string; profilePath?: string | null }) {
  return (
    <span className="reel-face">
      {profilePath ? (
        // eslint-disable-next-line @next/next/no-img-element -- TMDb image, already sized
        <img src={getProfileUrl(profilePath, "w185")} alt="" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
