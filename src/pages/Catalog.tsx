import { useEffect, useMemo, useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import CatalogTabs from '@/components/catalog/CatalogTabs'
import CatalogFilters, { type FiltersState } from '@/components/catalog/CatalogFilters'
import PropertyCard from '@/components/catalog/PropertyCard'
import ComplexCard from '@/components/catalog/ComplexCard'
import { Heading, Text } from '@/components/ui/Typography'
import { apiGet } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { useUiStore } from '@/store/useUiStore'
import type { Complex, Property } from '../../shared/types'

type Facets = { districts: string[]; metros: string[] }

export default function CatalogPage() {
  const { openLeadModal } = useUiStore()
  const [tab, setTab] = useState<'newbuild' | 'secondary' | 'rent'>('newbuild')
  const [filters, setFilters] = useState<FiltersState>({ bedrooms: '', priceMin: '', priceMax: '', areaMin: '', areaMax: '', district: '', metro: '', q: '' })
  const [data, setData] = useState<{ complexes: Complex[]; properties: Property[]; total: number; page: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Facets>('/api/facets').then(setFacets).catch(() => setFacets(null))
  }, [])

  const query = useMemo(() => {
    const sp = new URLSearchParams({ tab })
    Object.entries(filters).forEach(([k, v]) => {
      if (v) sp.set(k, v)
    })
    return sp.toString()
  }, [tab, filters])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const sp = new URLSearchParams(query)
    trackEvent('filter_apply', {
      page: 'catalog',
      tab: sp.get('tab') || '',
      bedrooms: sp.get('bedrooms') || '',
      priceMin: sp.get('priceMin') || '',
      priceMax: sp.get('priceMax') || '',
      areaMin: sp.get('areaMin') || '',
      areaMax: sp.get('areaMax') || '',
      district: sp.get('district') || '',
      metro: sp.get('metro') || '',
      q: sp.get('q') || '',
    })
    apiGet<{ complexes: Complex[]; properties: Property[] }>(`/api/catalog?${query}`)
      .then((d) => {
        if (!alive) return
        setData(d)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Ошибка')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [query])

  return (
    <SiteLayout>
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Heading size="h2">Каталог недвижимости</Heading>
              <Text size="sm" muted className="mt-1">Фильтруйте по спальням, цене, району и метро.</Text>
            </div>
            <CatalogTabs value={tab} onChange={(t) => setTab(t)} />
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <CatalogFilters tab={tab} value={filters} onChange={setFilters} facets={facets} />
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : (
              <div className="space-y-8">
                {tab === 'newbuild' && data?.complexes?.length ? (
                  <section>
                    <Heading size="h4" className="mb-3">Жилые комплексы</Heading>
                    <div className="grid gap-4 md:grid-cols-3">
                      {data.complexes.map((c) => (
                        <ComplexCard key={c.id} item={c} />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section>
                  <Heading size="h4" className="mb-3">Объекты</Heading>
                  {data?.properties?.length ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {data.properties.map((p) => (
                        <PropertyCard key={p.id} item={p} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Нет результатов</div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA: Купить / Продать / Сдать */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Купить недвижимость */}
            <div
              onClick={() => {
                trackEvent('click_buy_sell', { page: 'catalog', block: 'buy_cta', tab: 'buy' })
                openLeadModal('buy_sell', { page: 'catalog', block: 'buy_cta' }, { initialTab: 'buy' })
              }}
              className="group relative flex cursor-pointer items-stretch overflow-hidden rounded-sm border border-white/10 transition-colors hover:border-white/25"
            >
              <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">
                <Heading size="h3" className="font-serif text-2xl font-normal leading-tight text-white lg:text-3xl">
                  Купить<br />недвижимость
                </Heading>
              </div>
              <div className="relative hidden w-1/2 overflow-hidden sm:block">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
                  alt="Купить недвижимость"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
              </div>
            </div>

            {/* Продать недвижимость */}
            <div
              onClick={() => {
                trackEvent('click_buy_sell', { page: 'catalog', block: 'sell_cta', tab: 'sell' })
                openLeadModal('buy_sell', { page: 'catalog', block: 'sell_cta' }, { initialTab: 'sell' })
              }}
              className="group relative flex cursor-pointer items-stretch overflow-hidden rounded-sm border border-white/10 transition-colors hover:border-white/25"
            >
              <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">
                <Heading size="h3" className="font-serif text-2xl font-normal leading-tight text-white lg:text-3xl">
                  Продать<br />недвижимость
                </Heading>
              </div>
              <div className="relative hidden w-1/2 overflow-hidden sm:block">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"
                  alt="Продать недвижимость"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
              </div>
            </div>

            {/* Сдать недвижимость */}
            <div
              onClick={() => {
                trackEvent('click_buy_sell', { page: 'catalog', block: 'rent_cta', tab: 'sell' })
                openLeadModal('consultation', { page: 'catalog', block: 'rent_cta' })
              }}
              className="group relative flex cursor-pointer items-stretch overflow-hidden rounded-sm border border-white/10 transition-colors hover:border-white/25"
            >
              <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">
                <Heading size="h3" className="font-serif text-2xl font-normal leading-tight text-white lg:text-3xl">
                  Сдать<br />недвижимость
                </Heading>
              </div>
              <div className="relative hidden w-1/2 overflow-hidden sm:block">
                <img
                  src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
                  alt="Сдать недвижимость"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
