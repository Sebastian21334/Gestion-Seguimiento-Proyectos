export function Avatar({
  name,
  githubUsername,
  size = "normal",
}: {
  name: string;
  githubUsername?: string | null;
  size?: "normal" | "large";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`avatar avatar-${size}`} aria-label={name}>
      {githubUsername ? (
        <img
          src={`https://github.com/${encodeURIComponent(githubUsername)}.png?size=96`}
          alt={name}
          width={size === "large" ? 80 : 40}
          height={size === "large" ? 80 : 40}
          referrerPolicy="no-referrer"
        />
      ) : (
        initials
      )}
    </span>
  );
}
