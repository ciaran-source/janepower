export const STAGE_WEIGHTS: Record<string, number> = {
  new: 0.1,
  submitted: 0.25,
  in_review: 0.5,
  approved: 0.8,
  funded: 1.0,
  declined: 0,
};

export const STAGE_LABELS: Record<string, string> = {
  new: "New",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  funded: "Funded",
  declined: "Declined",
};

export const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  in_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  funded: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};
