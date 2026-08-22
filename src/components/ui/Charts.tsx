import { useMemo } from 'react'

interface ChartDatum {
  label: string
  value: number
}

interface TrendChartProps {
  data: ChartDatum[]
  color?: string
  height?: number
  valuePrefix?: string
  valueSuffix?: string
}

/** Hafif SVG bar chart — bağımlılık yok */
export function TrendChart({
  data,
  color = '#2563eb',
  height = 180,
  valuePrefix = '',
  valueSuffix = '',
}: TrendChartProps) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data])
  const barWidth = 100 / Math.max(1, data.length)

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            x2="100"
            y1={(height / 3) * p}
            y2={(height / 3) * p}
            stroke="#f1f5f9"
            strokeWidth="0.2"
          />
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 3 - 4)
          const x = i * barWidth + barWidth * 0.2
          const w = barWidth * 0.6
          const y = height / 3 - h - 2
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="0.5"
                fill={color}
                opacity="0.85"
              >
                <title>{`${d.label}: ${valuePrefix}${d.value.toLocaleString('tr-TR')}${valueSuffix}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-slate-400 flex-1 text-center truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[]
  size?: number
}

/** Hafif SVG donut chart */
export function DonutChart({ segments, size = 140 }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {total > 0 &&
          segments.map((seg, i) => {
            const len = (seg.value / total) * circumference
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return el
          })}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90"
          style={{ transformOrigin: 'center', fontSize: '14px', fontWeight: 700, fill: '#1e293b' }}
        >
          {total}
        </text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm" style={{ background: seg.color }} />
            <span className="text-slate-600 flex-1">{seg.label}</span>
            <span className="font-semibold text-slate-800">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
