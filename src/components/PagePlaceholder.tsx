interface PagePlaceholderProps {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <h3 className="text-xl font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mx-auto">{description}</p>
    </div>
  )
}
