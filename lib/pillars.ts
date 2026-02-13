export const PILLARS = ["Move", "Discover", "Connect"] as const;
export type Pillar = (typeof PILLARS)[number];

export const pillarColors: Record<string, string> = {
  Move: "bg-green-100 text-green-800 border-green-300",
  Discover: "bg-blue-100 text-blue-800 border-blue-300",
  Connect: "bg-purple-100 text-purple-800 border-purple-300",
};

export const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 border-gray-300",
  validated: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  needs_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

export const runStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  searching: "bg-blue-100 text-blue-800 border-blue-300",
  validating: "bg-indigo-100 text-indigo-800 border-indigo-300",
  storing: "bg-cyan-100 text-cyan-800 border-cyan-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};

export const PILLAR_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; badge: string; border: string }
> = {
  Move: {
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
    border: "border-emerald-400",
  },
  Discover: {
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-300",
    border: "border-amber-400",
  },
  Connect: {
    bg: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    text: "text-purple-800",
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700 border-purple-300",
    border: "border-purple-400",
  },
};
