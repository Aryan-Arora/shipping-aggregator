"use client";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export interface BarDatum {
  label: string;
  value: number;
}

export function BarList({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label}>
          <div
            className="mb-1 flex items-center justify-between text-[0.8rem]"
            style={{ color: "var(--color-text-primary)" }}
          >
            <span className="truncate capitalize">{d.label.replace(/_/g, " ")}</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{d.value}</span>
          </div>
          <div className="h-2 w-full rounded-full" style={{ backgroundColor: "var(--color-bg)" }}>
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
                transition: "width var(--duration-slow) var(--ease-spring)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
