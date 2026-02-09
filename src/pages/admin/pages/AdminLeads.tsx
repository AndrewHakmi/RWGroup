import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/api'
import { useUiStore } from '@/store/useUiStore'
import type { Lead } from '../../../../shared/types'

export default function AdminLeadsPage() {
  const token = useUiStore((s) => s.adminToken)
  const headers = useMemo(() => ({ 'x-admin-token': token || '' }), [token])
  const [list, setList] = useState<Lead[]>([])
  const [error, setError] = useState<string | null>(null)

  const labelType = (lead: Lead) => {
    switch (lead.form_type) {
      case 'consultation':
        return 'Консультация'
      case 'buy_sell':
        return `Купить / Продать${lead.tab ? `: ${lead.tab === 'buy' ? 'покупка' : 'продажа'}` : ''}`
      case 'view_details':
        return 'Запрос по объекту'
      case 'partner':
        return 'Партнёрство'
      default:
        return lead.form_type
    }
  }

  useEffect(() => {
    apiGet<Lead[]>('/api/admin/leads', headers)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
  }, [headers])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold">Лиды</div>
        <div className="mt-1 text-sm text-slate-600">Заявки из всех форм с источником.</div>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[720px] md:min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">Время</th>
              <th className="px-3 py-2">Тип</th>
              <th className="px-3 py-2">Имя</th>
              <th className="px-3 py-2">Телефон</th>
              <th className="px-3 py-2">Комментарий</th>
              <th className="px-3 py-2">Источник</th>
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.id} className="border-t border-slate-200">
                <td className="px-3 py-2 text-slate-700">{new Date(l.created_at).toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2 text-slate-700">{labelType(l)}</td>
                <td className="px-3 py-2 font-medium text-slate-900">{l.name}</td>
                <td className="px-3 py-2 text-slate-700">{l.phone}</td>
                <td className="px-3 py-2 text-slate-700">{l.comment?.trim() ? l.comment : '-'}</td>
                <td className="px-3 py-2 text-slate-700">
                  {l.source.page}{l.source.block ? ` / ${l.source.block}` : ''}{l.source.object_id ? ` / ${l.source.object_id}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
