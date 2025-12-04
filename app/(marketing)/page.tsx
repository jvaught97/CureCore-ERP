import { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { FeaturesRow } from '@/components/marketing/FeaturesRow';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { AIShowcase } from '@/components/marketing/AIShowcase';
import { TestimonialCarousel } from '@/components/marketing/TestimonialCarousel';
import { CTASection } from '@/components/marketing/CTASection';
import { DecorativeBlob } from '@/components/marketing/DecorativeBlob';
import { BackgroundPattern } from '@/components/marketing/BackgroundPattern';
import Link from 'next/link';
import { ArrowRight, Calculator, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'CureCore - Smart Manufacturing Operating System',
  description: 'Reduce busywork, launch faster, and know your costs before you scale. The all-in-one SMOS for modern manufacturing.',
  openGraph: {
    title: 'CureCore - Smart Manufacturing Operating System',
    description: 'Reduce busywork, launch faster, and know your costs before you scale.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturesRow />
      <HowItWorks />

      {/* ROI Teaser */}
      <section className="relative border-b bg-gradient-to-br from-[#E8F5F3] via-white to-[#E8F5F3] px-4 py-20 overflow-hidden">
        <BackgroundPattern variant="dots" />
        <DecorativeBlob position="top-right" color="accent" size="large" />
        <DecorativeBlob position="bottom-left" color="secondary" size="medium" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white rounded-full shadow-sm border border-[#174940]/10">
            <Calculator className="h-4 w-4 text-[#174940]" />
            <span className="text-sm font-medium text-[#174940]">Free ROI Calculator</span>
          </div>

          <h2 className="mb-4 text-4xl font-bold md:text-5xl bg-gradient-to-r from-[#174940] via-[#2D6A5F] to-[#48A999] bg-clip-text text-transparent">
            Calculate Your ROI in 2 Minutes
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-700">
            See exactly how much time and money CureCore will save your team.
            Most brands save <span className="font-semibold text-[#174940]">45+ hours per week</span> and see ROI in <span className="font-semibold text-[#174940]">under 3 months</span>.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-[#174940]/10 shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#174940] mb-1">45+</div>
              <div className="text-sm text-gray-600">Hours saved weekly</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-[#174940]/10 shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#174940] mb-1">3x</div>
              <div className="text-sm text-gray-600">Faster launches</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-[#174940]/10 shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-[#174940] mb-1">90d</div>
              <div className="text-sm text-gray-600">Average ROI timeframe</div>
            </div>
          </div>

          <Button size="lg" asChild className="bg-gradient-to-r from-[#174940] to-[#2D6A5F] hover:from-[#2D6A5F] hover:to-[#174940] text-white shadow-lg shadow-[#174940]/20 transition-all duration-300 hover:scale-105">
            <Link href="/roi">
              Calculate Your Savings
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <AIShowcase />
      <TestimonialCarousel />
      <CTASection />
    </>
  );
}
