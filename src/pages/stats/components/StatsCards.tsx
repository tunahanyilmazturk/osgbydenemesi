interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  color: string
}

export function StatCard({ title, value, sub, color }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 shadow-sm p-4 ${color}`}>
      <p className="text-[10px] font-semibold text-slate-500 uppercase">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

interface TableCardProps {
  title: string
  headers: string[]
  rows: Array<Array<string | number>>
}

export function TableCard({ title, headers, rows }: TableCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 overflow-hidden">
      <h4 className="text-sm font-bold text-slate-800 mb-3">{title}</h4>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 sticky top-0">
            <tr>
              {headers.map((header) => <th key={header} className="px-3 py-2 font-medium whitespace-nowrap">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-3 py-4 text-center text-slate-400">Veri yok</td></tr>
            ) : rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-slate-600 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
