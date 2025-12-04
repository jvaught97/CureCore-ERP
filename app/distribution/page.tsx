'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { createClient } from '@/app/utils/supabase/client'
import { Plus, Sparkles } from 'lucide-react'
import { inventoryDemoData } from '@/data/inventoryDemo'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { PremiumDistributionView } from '@/app/distribution/_components/PremiumDistributionView'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'

type ShipmentRow = {
  id: string
  status: string
  carrier: string | null
  service: string | null
  ship_date: string | null
  total_cost: number | null
  sales_order_id: string | null
  warehouses: { name: string | null } | null
}

export default function DistributionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { mode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [shipments, setShipments] = useState<ShipmentRow[]>([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const bypass = (process.env.NEXT_PUBLIC_SUPABASE_BYPASS_AUTH ?? 'true') === 'true'

        if (bypass) {
          if (!isMounted) return
          setShipments(
            inventoryDemoData.ingredients.slice(0, 3).map((ing, idx) => ({
              id: `demo-sh-${idx}`,
              status: idx === 0 ? 'ready' : idx === 1 ? 'in_transit' : 'delivered',
              carrier: idx === 0 ? 'FedEx' : 'UPS',
              service: idx === 0 ? '2Day' : 'Ground',
              ship_date: new Date(Date.now() - idx * 86400000).toISOString(),
              total_cost: 180 + idx * 45,
              sales_order_id: `demo-so-${idx}`,
              warehouses: { name: idx === 0 ? 'Main Warehouse' : 'East DC' },
            })),
          )
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('shipments')
          .select('id,status,carrier,service,ship_date,total_cost,sales_order_id,warehouses(name)')
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code !== '42P01') console.error('Failed to load shipments', error)
          if (isMounted) setShipments([])
          return
        }
        if (isMounted) setShipments(data ?? [])
      } catch (err) {
        console.error('Unexpected error loading shipments', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [supabase])

  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const cardBg = getCardBackground(mode)
  const borderColor = getBorderColor(mode)

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AppNav currentPage="distribution" />

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${cardBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">Distribution Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>Distribution</h1>
            <p className={`${textMuted} text-sm md:text-base`}>Plan and track outbound shipments, packing, and freight costs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/distribution/shipments/new')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              New Shipment
            </button>
          </div>
        </div>
      </div>

      <AnimatedBackground />
      <div className="relative z-10">
        <PremiumDistributionView
          shipments={shipments}
          loading={loading}
          onView={(shipment) => router.push(`/distribution/shipments/${shipment.id}`)}
        />
      </div>
    </div>
  )
}
