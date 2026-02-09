import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { apiGet, apiDelete, apiPut } from '@/lib/api'
import { useUiStore } from '@/store/useUiStore'
import PropertyCard from '@/components/catalog/PropertyCard'
import ComplexCard from '@/components/catalog/ComplexCard'
import type { Complex, Property } from '../../../../shared/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import CatalogFilters, { type FiltersState } from '@/components/catalog/CatalogFilters'

export default function AdminCatalogPage() {
  const token = useUiStore((s) => s.adminToken)
  const headers = useMemo(() => ({ 'x-admin-token': token || '' }), [token])
  const [tab, setTab] = useState<'property' | 'complex'>('property')
  const [items, setItems] = useState<(Property | Complex)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FiltersState>({
    bedrooms: '',
    priceMin: '',
    priceMax: '',
    areaMin: '',
    areaMax: '',
    district: '',
    metro: '',
    q: '',
  })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [total, setTotal] = useState(0)
  const [outdated, setOutdated] = useState<{ properties: number; complexes: number; total: number } | null>(null)
  
  // Editing state
  const [editingItem, setEditingItem] = useState<Property | Complex | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  const query = useMemo(() => {
    const sp = new URLSearchParams({ type: tab, page: String(page), limit: String(limit) })
    Object.entries(filters).forEach(([k, v]) => {
      if (v) sp.set(k, v)
    })
    return sp.toString()
  }, [tab, page, limit, filters])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    apiGet<{ items: (Property | Complex)[]; total: number; page: number; limit: number }>(`/api/admin/catalog/items?${query}`, headers)
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false))
  }, [headers, query])

  useEffect(() => {
    load()
  }, [load])

  const loadOutdated = useCallback(() => {
    apiGet<{ properties: number; complexes: number; total: number }>('/api/admin/catalog/outdated', headers)
      .then(setOutdated)
      .catch(() => setOutdated(null))
  }, [headers])

  useEffect(() => {
    loadOutdated()
  }, [loadOutdated])

  useEffect(() => {
    setPage(1)
  }, [tab, filters, limit])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  // Check for outdated data (district === "Array" indicates old import)
  const hasOutdatedData = (outdated?.total || 0) > 0

  const reimportAllFeeds = async () => {
    if (!confirm('Это переимпортирует все активные фиды. Процесс может занять некоторое время. Продолжить?')) return
    try {
      setLoading(true)
      const feedsRes = await apiGet<any[]>('/api/admin/feeds', headers)
      const activeFeeds = feedsRes.filter((f: any) => f.is_active)
      let reimported = 0
      let skipped = 0

      for (const feed of activeFeeds) {
        if (feed.mode !== 'url' || !feed.url) {
          skipped += 1
          continue
        }
        const fd = new FormData()
        fd.append('source_id', feed.id)
        fd.append('entity', 'property')
        fd.append('url', feed.url)
        await fetch('/api/admin/import/run', {
          method: 'POST',
          headers: { 'x-admin-token': token || '' },
          body: fd
        })
        reimported += 1
      }

      alert(`Переимпортировано ${reimported} фид(ов). ${skipped ? `Пропущено ${skipped} (требуется файл). ` : ''}Обновите страницу для просмотра результатов.`)
      load()
      loadOutdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка при переимпорте')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return
    try {
      await apiDelete(`/api/admin/catalog/items/${tab}/${id}`, headers)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка при удалении')
    }
  }

  const handleEdit = (item: Property | Complex) => {
    setEditingItem(item)
    setEditForm({ ...item })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    
    const fd = new FormData()
    fd.append('file', file)
    
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-token': token || '' },
        body: fd
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      
      const newImages = [...(editForm.images || []), json.data.url]
      setEditForm({ ...editForm, images: newImages })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...(editForm.images || [])]
    newImages.splice(index, 1)
    setEditForm({ ...editForm, images: newImages })
  }

  const handleSave = async () => {
    if (!editingItem) return
    try {
      await apiPut(`/api/admin/catalog/items/${tab}/${editingItem.id}`, editForm, headers)
      setEditingItem(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка при сохранении')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Каталог</div>
          <div className="mt-1 text-sm text-slate-600">Управление объектами (удаление, редактирование).</div>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === 'property' ? 'default' : 'secondary'} onClick={() => setTab('property')}>Лоты</Button>
          <Button variant={tab === 'complex' ? 'default' : 'secondary'} onClick={() => setTab('complex')}>ЖК</Button>
        </div>
      </div>

      {hasOutdatedData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">Обнаружены устаревшие данные</h4>
              <p className="mt-1 text-sm text-amber-700">
                Некоторые объекты содержат устаревшие данные (например, район отображается как "Array").
                Это означает, что объекты были импортированы до обновления логики парсинга фидов.
              </p>
              <p className="mt-2 text-sm text-amber-700">
                <strong>Рекомендуется переимпортировать фиды</strong>, чтобы получить все новые поля:
                скидки, жилую площадь, площадь кухни, этаж, ремонт, евроремонт и другие характеристики.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={reimportAllFeeds} disabled={loading}>
                  {loading ? 'Переимпорт...' : 'Переимпортировать все фиды'}
                </Button>
                <a href="/admin#feeds">
                  <Button size="sm" variant="secondary">
                    Перейти к фидам
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CatalogFilters
          tab={tab === 'complex' ? 'newbuild' : 'secondary'}
          value={filters}
          onChange={setFilters}
        />
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Загрузка...</div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <div>
              Товаров: <span className="font-semibold text-slate-900">{total}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>На странице</span>
                <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
                  {[12, 24, 36, 48, 72, 96].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page <= 1}>
                  Назад
                </Button>
                <span>
                  Страница {page} из {totalPages}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page >= totalPages}>
                  Вперёд
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                {tab === 'property' ? (
                  <PropertyCard item={item as Property} />
                ) : (
                  <ComplexCard item={item as Complex} />
                )}
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <a 
                    href={tab === 'property' ? `/property/${item.id}` : `/complex/${item.id}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-slate-700 shadow hover:bg-slate-50 hover:text-slate-900"
                  >
                    На сайт
                  </a>
                  <Button size="sm" onClick={() => handleEdit(item)}>
                    Ред.
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={() => handleDelete(item.id)}>
                    Уд.
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="col-span-full text-center text-slate-500">Нет объектов</div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <div>
              Товаров: <span className="font-semibold text-slate-900">{total}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>На странице</span>
                <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
                  {[12, 24, 36, 48, 72, 96].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page <= 1}>
                  Назад
                </Button>
                <span>
                  Страница {page} из {totalPages}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page >= totalPages}>
                  Вперёд
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title={`Редактирование ${tab === 'property' ? 'лота' : 'ЖК'}`}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
            {/* Базовая информация */}
            <div className="space-y-3 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Основная информация</h3>

              <div>
                <label className="text-xs font-medium text-slate-700">Название</label>
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                />
              </div>

              {tab === 'property' && (
                <div>
                  <label className="text-xs font-medium text-slate-700">Тип сделки</label>
                  <Select
                    value={editForm.deal_type || 'sale'}
                    onChange={(e) => setEditForm({...editForm, deal_type: e.target.value})}
                  >
                    <option value="sale">Продажа</option>
                    <option value="rent">Аренда</option>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700">Описание</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  rows={4}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Подробное описание объекта"
                />
              </div>
            </div>

            {/* Цена и площадь */}
            <div className="space-y-3 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Цена и площадь</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    {tab === 'property' ? 'Цена' : 'Цена от'}
                  </label>
                  <Input
                    type="number"
                    value={editForm.price || editForm.price_from || 0}
                    onChange={(e) => setEditForm({...editForm, [tab === 'property' ? 'price' : 'price_from']: Number(e.target.value)})}
                  />
                </div>

                {tab === 'property' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700">Старая цена (для скидки)</label>
                    <Input
                      type="number"
                      value={editForm.old_price || ''}
                      onChange={(e) => setEditForm({...editForm, old_price: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Необязательно"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    {tab === 'property' ? 'Площадь общая' : 'Площадь от'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.area_total || editForm.area_from || 0}
                    onChange={(e) => setEditForm({...editForm, [tab === 'property' ? 'area_total' : 'area_from']: Number(e.target.value)})}
                  />
                </div>

                {tab === 'property' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700">Жилая площадь</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.area_living || ''}
                      onChange={(e) => setEditForm({...editForm, area_living: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Необязательно"
                    />
                  </div>
                )}
              </div>

              {tab === 'property' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Площадь кухни</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.area_kitchen || ''}
                      onChange={(e) => setEditForm({...editForm, area_kitchen: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Необязательно"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Спальни</label>
                    <Input
                      type="number"
                      value={editForm.bedrooms || 0}
                      onChange={(e) => setEditForm({...editForm, bedrooms: Number(e.target.value)})}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Локация */}
            <div className="space-y-3 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Местоположение</h3>

              <div>
                <label className="text-xs font-medium text-slate-700">Район</label>
                <Input
                  value={editForm.district || ''}
                  onChange={(e) => setEditForm({...editForm, district: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Метро (через запятую)</label>
                <Input
                  value={Array.isArray(editForm.metro) ? editForm.metro.join(', ') : (editForm.metro || '')}
                  onChange={(e) => setEditForm({...editForm, metro: e.target.value.split(',').map((m: string) => m.trim()).filter(Boolean)})}
                  placeholder="Например: Парк Победы, Кутузовская"
                />
              </div>
            </div>

            {/* Характеристики Property */}
            {tab === 'property' && (
              <div className="space-y-3 pb-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Характеристики</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Этаж</label>
                    <Input
                      type="number"
                      value={editForm.floor || ''}
                      onChange={(e) => setEditForm({...editForm, floor: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Необязательно"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Всего этажей</label>
                    <Input
                      type="number"
                      value={editForm.floors_total || ''}
                      onChange={(e) => setEditForm({...editForm, floors_total: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Необязательно"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Номер квартиры</label>
                    <Input
                      value={editForm.lot_number || ''}
                      onChange={(e) => setEditForm({...editForm, lot_number: e.target.value})}
                      placeholder="Необязательно"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Ремонт</label>
                    <Input
                      value={editForm.renovation || ''}
                      onChange={(e) => setEditForm({...editForm, renovation: e.target.value})}
                      placeholder="Например: черновая, чистовая"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Секция здания</label>
                    <Input
                      value={editForm.building_section || ''}
                      onChange={(e) => setEditForm({...editForm, building_section: e.target.value})}
                      placeholder="Необязательно"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Состояние здания</label>
                    <Select
                      value={editForm.building_state || ''}
                      onChange={(e) => setEditForm({...editForm, building_state: e.target.value || undefined})}
                    >
                      <option value="">Не указано</option>
                      <option value="unfinished">В процессе строительства</option>
                      <option value="built">Построено</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Квартал сдачи</label>
                    <Input
                      type="number"
                      min="1"
                      max="4"
                      value={editForm.ready_quarter || ''}
                      onChange={(e) => setEditForm({...editForm, ready_quarter: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="1-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Год постройки/сдачи</label>
                    <Input
                      type="number"
                      value={editForm.built_year || ''}
                      onChange={(e) => setEditForm({...editForm, built_year: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Например: 2025"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_euroflat"
                    checked={editForm.is_euroflat || false}
                    onChange={(e) => setEditForm({...editForm, is_euroflat: e.target.checked})}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="is_euroflat" className="text-sm font-medium text-slate-700">
                    Европланировка
                  </label>
                </div>
              </div>
            )}

            {/* Характеристики Complex */}
            {tab === 'complex' && (
              <div className="space-y-3 pb-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Характеристики ЖК</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Застройщик</label>
                    <Input
                      value={editForm.developer || ''}
                      onChange={(e) => setEditForm({...editForm, developer: e.target.value})}
                      placeholder="Название застройщика"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Срок сдачи</label>
                    <Input
                      value={editForm.handover_date || ''}
                      onChange={(e) => setEditForm({...editForm, handover_date: e.target.value})}
                      placeholder="Например: 4 кв. 2025"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Класс жилья</label>
                    <Input
                      value={editForm.class || ''}
                      onChange={(e) => setEditForm({...editForm, class: e.target.value})}
                      placeholder="Например: комфорт, бизнес"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Тип отделки</label>
                    <Input
                      value={editForm.finish_type || ''}
                      onChange={(e) => setEditForm({...editForm, finish_type: e.target.value})}
                      placeholder="Например: черновая, чистовая"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Фотографии */}
            <div className="space-y-3 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Фотографии</h3>
              <p className="text-xs text-slate-500">Первое фото будет использоваться как обложка. Перетащите для изменения порядка.</p>

              <div className="grid grid-cols-4 gap-2">
                {(editForm.images || []).map((img: string, i: number) => (
                  <div key={i} className="relative group aspect-square bg-slate-100 rounded overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-slate-900/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {i + 1}
                    </div>
                    <button
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(i)}
                      title="Удалить фото"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-50 aspect-square">
                  <span className="text-2xl text-slate-400">+</span>
                  <span className="text-xs text-slate-500 mt-1">Добавить</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </label>
              </div>
            </div>

            {/* Статус */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Публикация</h3>

              <div>
                <label className="text-xs font-medium text-slate-700">Статус</label>
                <Select
                  value={editForm.status || 'active'}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                >
                  <option value="active">Активен (отображается на сайте)</option>
                  <option value="hidden">Скрыт (не отображается)</option>
                  <option value="archived">Архив</option>
                </Select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setEditingItem(null)}>Отмена</Button>
              <Button onClick={handleSave}>Сохранить изменения</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
