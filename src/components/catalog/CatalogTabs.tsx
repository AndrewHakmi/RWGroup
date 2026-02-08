import { Button } from '@/components/ui/Button'

type Tab = 'newbuild' | 'secondary' | 'rent'

const TABS: { key: Tab; title: string }[] = [
  { key: 'newbuild', title: 'Новостройки' },
  { key: 'secondary', title: 'Вторичка' },
  { key: 'rent', title: 'Аренда' },
]

export default function CatalogTabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-surface p-1 gap-1">
      {TABS.map((t) => (
        <Button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          variant={value === t.key ? 'default' : 'ghost'}
          size="sm"
          className={value === t.key ? '' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
        >
          {t.title}
        </Button>
      ))}
    </div>
  )
}

