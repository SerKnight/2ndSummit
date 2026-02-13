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
