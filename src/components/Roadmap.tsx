import { FileText, Search, Eye, Scale, Key } from 'lucide-react'
import { Heading, Text } from '@/components/ui/Typography'
import { cn } from '@/lib/utils'

const steps = [
  {
    id: '01',
    title: 'Заявка',
    description: 'Оставляете заявку на сайте или по телефону',
    icon: FileText,
  },
  {
    id: '02',
    title: 'Подбор',
    description: 'Формируем персональную подборку объектов',
    icon: Search,
  },
  {
    id: '03',
    title: 'Показ',
    description: 'Организуем просмотры в удобное время',
    icon: Eye,
  },
  {
    id: '04',
    title: 'Сделка',
    description: 'Полное юридическое сопровождение',
    icon: Scale,
  },
  {
    id: '05',
    title: 'Ключи',
    description: 'Поздравляем вас с новосельем',
    icon: Key,
  },
]

export default function Roadmap() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <Heading size="h2" className="text-center mb-16 text-white">
          Дорожная карта сделки с недвижимостью
        </Heading>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-6 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-accent opacity-30" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-4 relative">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center text-center group">
                {/* Number Circle */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold z-10 mb-6 transition-all duration-500",
                  "bg-background border-2 border-primary text-primary group-hover:bg-primary group-hover:text-background"
                )}>
                  {step.id}
                </div>

                {/* Icon Circle */}
                <div className="mb-6 relative">
                  <div className="w-24 h-24 rounded-full bg-surface border border-slate-700 flex items-center justify-center transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(166,162,103,0.3)]">
                    <step.icon className="w-10 h-10 text-primary transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  {/* Decorative triangle/arrow below number pointing to icon (optional, simplistic version here) */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-700 md:hidden" />
                </div>

                {/* Content */}
                <div className="max-w-[200px]">
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
