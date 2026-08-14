"use client";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export interface DonutDatum {
  label: string;
  value: number;
}

export function DonutChart({ data, size = 160 }: { data: DonutDatum[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const strokeWidth = size * 0.22;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const segment = {
      color: PALETTE[i % PALETTE.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
      fraction,
    };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {total === 0 ? (
            <circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
            />
          ) : (
            segments.map((s, i) => (
              <circle
                key={i}
                cx={radius}
                cy={radius}
                r={innerRadius}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={s.dasharray}
                strokeDashoffset={s.dashoffset}
                style={{ transition: "stroke-dasharray var(--duration-slow) var(--ease-spring)" }}
              />
            ))
          )}
        </g>
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: size * 0.16, fontWeight: 600, fill: "var(--color-text-primary)" }}
        >
          {total}
        </text>
      </svg>
      <div className="min-w-[130px] flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between gap-3 text-[0.8rem]">
            <span className="flex min-w-0 items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="truncate capitalize">{d.label.replace(/_/g, " ")}</span>
            </span>
            <span className="shrink-0 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
