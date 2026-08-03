import type { ScanAngle } from "@/lib/engine/types";

// Pose de référence — pas une prévisualisation caméra live (le navigateur ne
// permet pas d'overlay fiable sur <input capture>), juste un repère visuel
// pour cadrer la photo de façon comparable dans le temps.
export function Silhouette({ angle }: { angle: ScanAngle }) {
  const common = "opacity-40";
  return (
    <svg
      viewBox="0 0 100 160"
      className={`h-full w-full ${common}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="3 3"
    >
      <circle cx="50" cy="20" r="14" />
      {angle === "profil" ? (
        <path d="M50 34 C 40 40, 36 55, 40 75 L 44 120 L 40 155 M 44 120 L 60 155 M 40 75 L 60 78 L 66 55 M 40 75 L 30 95" />
      ) : (
        <path d="M50 34 C 30 40, 26 60, 30 78 L 34 120 L 28 155 M 34 120 L 44 122 L 50 155 M 44 122 L 56 122 L 62 155 M 34 120 L 66 120 L 70 78 C 74 60, 70 40, 50 34 M 30 78 L 20 100 M 70 78 L 80 100" />
      )}
    </svg>
  );
}
