'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/nav/AppNav'
import { Beaker, CheckCircle2, Plus, TestTube, Sparkles, ArrowUpRight } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useTheme } from '@/lib/context/ThemeContext'
import {
  getBackgroundClass,
  getTextColor,
  getTextMuted,
  getCardBackground,
  getBorderColor
} from '@/lib/utils/themeUtils'
import { getRDIngredients, getRDFormulas } from './_actions'
import { RdIngredientsList } from './_components/RdIngredientsList'
import { RdFormulasList } from './_components/RdFormulasList'
import type { RdIngredient } from './_components/RdIngredientsList'
import type { RdFormula } from './_components/RdFormulasList'

type TabKey = 'formulas' | 'ingredients' | 'estimator'

type LaunchEstimate = {
  packagingCost: number
  rndCost: number
  testingCost: number
  marketingCost: number
}

const DEFAULT_ESTIMATE: LaunchEstimate = {
  packagingCost: 0,
  rndCost: 0,
  testingCost: 0,
  marketingCost: 0,
}

export default function RndPage() {
  const router = useRouter()
  const { mode } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('formulas')
  const [estimate] = useState<LaunchEstimate>(DEFAULT_ESTIMATE)
  const [ingredients, setIngredients] = useState<RdIngredient[]>([])
  const [formulas, setFormulas] = useState<RdFormula[]>([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const [loadingFormulas, setLoadingFormulas] = useState(false)

  const bgClass = getBackgroundClass(mode)
  const textColor = getTextColor(mode)
  const textMuted = getTextMuted(mode)
  const cardBg = getCardBackground(mode)
  const borderColor = getBorderColor(mode)

  const loadIngredients = async () => {
    setLoadingIngredients(true)
    try {
      const data = await getRDIngredients()
      setIngredients(data as RdIngredient[])
    } catch (error) {
      console.error('Failed to load ingredients:', error)
    } finally {
      setLoadingIngredients(false)
    }
  }

  const loadFormulas = async () => {
    setLoadingFormulas(true)
    try {
      const data = await getRDFormulas()
      setFormulas(data as RdFormula[])
    } catch (error) {
      console.error('Failed to load formulas:', error)
    } finally {
      setLoadingFormulas(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'ingredients') {
      loadIngredients()
    } else if (activeTab === 'formulas') {
      loadFormulas()
    }
  }, [activeTab])

  return (
    <div className={`min-h-screen ${bgClass}`}>
      <AppNav currentPage="rnd" />

      {/* Premium Header */}
      <div className={`border-b ${borderColor} ${cardBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#48A999] animate-pulse" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#48A999]">R&D Command</p>
            </div>
            <h1 className={`text-3xl md:text-4xl font-semibold ${textColor} mt-2`}>R&D Workspace</h1>
            <p className={`${textMuted} text-sm md:text-base`}>
              Manage experimental formulations, capture launch estimates, and analytics before production.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rnd/formulas/new')}
              className={`flex items-center gap-2 rounded-full border ${borderColor} px-4 py-2 ${textColor} hover:border-[#174940] transition`}
            >
              <Plus className="w-5 h-5" />
              New Formula
            </button>
            <button
              onClick={() => router.push('/rnd/estimates/new')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-6 py-3 rounded-full shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition"
            >
              <Plus className="w-5 h-5" />
              New Estimation
            </button>
          </div>
        </div>
      </div>

      <AnimatedBackground />
      <div className="relative z-10">
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        <nav className="flex flex-wrap gap-2">
          <TabButton label="Formulas" icon={<Beaker className="h-4 w-4" />} tab="formulas" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton
            label="R&D Ingredients"
            icon={<TestTube className="h-4 w-4" />}
            tab="ingredients"
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <TabButton
            label="Launch Estimator"
            icon={<CheckCircle2 className="h-4 w-4" />}
            tab="estimator"
            activeTab={activeTab}
            onClick={setActiveTab}
          />
        </nav>

        <section className={`${cardBg} rounded-2xl border ${borderColor} shadow-xl`}>
          {activeTab === 'formulas' && (
            <div className="p-6">
              {loadingFormulas ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`text-sm ${textMuted}`}>Loading formulas...</div>
                </div>
              ) : (
                <RdFormulasList formulas={formulas} onRefresh={loadFormulas} />
              )}
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="p-6">
              {loadingIngredients ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`text-sm ${textMuted}`}>Loading ingredients...</div>
                </div>
              ) : (
                <RdIngredientsList ingredients={ingredients} onRefresh={loadIngredients} />
              )}
            </div>
          )}

          {activeTab === 'estimator' && <EstimatorTab estimate={estimate} mode={mode} textColor={textColor} textMuted={textMuted} cardBg={cardBg} borderColor={borderColor} />}
        </section>
        </main>
      </div>
    </div>
  )
}

function TabButton({
  label,
  icon,
  tab,
  activeTab,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  tab: TabKey
  activeTab: TabKey
  onClick: (tab: TabKey) => void
}) {
  const { mode } = useTheme()
  const textColor = getTextColor(mode)
  const borderColor = getBorderColor(mode)

  const isActive = activeTab === tab
  return (
    <button
      onClick={() => onClick(tab)}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
        isActive
          ? 'bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white shadow-lg shadow-[#174940]/30'
          : `border ${borderColor} ${textColor} hover:border-[#174940]`
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EstimatorTab({
  estimate,
  mode,
  textColor,
  textMuted,
  cardBg,
  borderColor,
}: {
  estimate: LaunchEstimate
  mode: string
  textColor: string
  textMuted: string
  cardBg: string
  borderColor: string
}) {
  const total =
    estimate.marketingCost + estimate.packagingCost + estimate.rndCost + estimate.testingCost

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[320px_1fr]">
      <div className={`space-y-4 rounded-2xl border ${borderColor} ${cardBg} p-4 shadow-lg`}>
        <h2 className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>Launch Estimate</h2>
        <div className={`space-y-3 text-sm ${textColor}`}>
          <div className="flex items-center justify-between">
            <span>R&amp;D Cost</span>
            <span className="font-medium">${estimate.rndCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Testing &amp; Licensing</span>
            <span className="font-medium">${estimate.testingCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Packaging</span>
            <span className="font-medium">${estimate.packagingCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Marketing</span>
            <span className="font-medium">${estimate.marketingCost.toFixed(2)}</span>
          </div>
          <div className={`flex items-center justify-between border-t ${borderColor} pt-3 text-base font-semibold ${textColor}`}>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#48A999] to-[#2D6A5F] text-white px-4 py-2 text-sm font-medium shadow-lg shadow-[#174940]/30 hover:scale-[1.02] transition">
          <CheckCircle2 className="h-4 w-4" />
          Approve &amp; Push to Production
        </button>
      </div>

      <div className={`min-h-[280px] rounded-2xl border border-dashed ${borderColor} ${cardBg} p-6 shadow-lg`}>
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${textColor}`}>Launch Checklist Overview</h3>
          <p className={`text-sm ${textMuted}`}>
            Use the dedicated estimator in the formulas workspace to quantify launch readiness, including packaging, marketing, and licensing costs.
          </p>
        </div>
      </div>
    </div>
  )
}
