interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export default function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} style={style} />
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex-1 flex items-end gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${30 + (i * 7) % 60}%` }} />
        ))}
      </div>
    </div>
  )
}
