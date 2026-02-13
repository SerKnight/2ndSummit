export const PILLARS = ["Move", "Discover", "Connect"] as const;
export type Pillar = (typeof PILLARS)[number];

export const pillarColors: Record<string, string> = {
  Move: "bg-green-100 text-green-800 border-green-300",
  Discover: "bg-blue-100 text-blue-800 border-blue-300",
  Connect: "bg-purple-100 text-purple-800 border-purple-300",
};

export const statusColors: Record<string, string> = {
  raw: "bg-gray-100 text-gray-800 border-gray-300",
  classified: "bg-blue-100 text-blue-800 border-blue-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  archived: "bg-slate-100 text-slate-600 border-slate-300",
};

export const runStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  running: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};
