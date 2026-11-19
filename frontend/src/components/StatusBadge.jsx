// Turns the backend status strings into coloured pills.
const COLORS = {
  "On Time": "green",
  Delayed: "red",
  Boarding: "blue",
  Departed: "purple",
  Landed: "grey",
  Cancelled: "red",
  Confirmed: "green",
  Paid: "green",
  Pending: "orange",
  Failed: "red",
  Refunded: "orange",
  approved: "green",
  pending: "orange",
  rejected: "red",
};

export default function StatusBadge({ status }) {
  const color = COLORS[status] || "grey";
  return <span className={`badge badge-${color}`}>{status}</span>;
}
