type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const STATUS_TONE: Record<string, Tone> = {
  booked: "neutral",
  picked_up: "accent",
  in_transit: "accent",
  delivered: "success",
  ndr: "warning",
  delivery_failed: "warning",
  rto: "danger",
  failed: "danger",
  pending: "neutral",
  shipped: "accent",
};

const TONE_STYLES: Record<Tone, React.CSSProperties> = {
  neutral: { backgroundColor: "var(--color-bg)", color: "var(--color-text-secondary)" },
  accent: { backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent-hover)" },
  success: { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" },
  warning: { backgroundColor: "var(--color-warning-soft)", color: "var(--color-warning)" },
  danger: { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" },
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status.toLowerCase()] ?? "neutral";
  return (
    <span className="badge" style={TONE_STYLES[tone]}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
