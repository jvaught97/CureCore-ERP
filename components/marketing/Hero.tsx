import Link from 'next/link';
import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copy } from '@/data/copy';
import { BackgroundPattern } from './BackgroundPattern';
import { DecorativeBlob } from './DecorativeBlob';
import { FadeIn } from './FadeIn';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-background via-[#E8F5F3]/30 to-background px-4 py-24 md:py-32">
      {/* Background Patterns & Decorations */}
      <BackgroundPattern variant="dots" />
      <DecorativeBlob position="top-right" color="primary" size="large" />
      <DecorativeBlob position="bottom-left" color="accent" size="medium" />

      <div className="container relative z-10 mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <FadeIn direction="right" className="flex flex-col justify-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-gradient-to-r from-[#174940]/10 to-[#48A999]/10 px-4 py-2 text-sm w-fit backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#174940]" />
              <span className="bg-gradient-to-r from-[#174940] to-[#2D6A5F] bg-clip-text font-semibold text-transparent">
                Smart Manufacturing Operating System
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
                {copy.hero.headline}
              </span>
            </h1>

            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              {copy.hero.subheadline}
            </p>

            <p className="mb-8 text-lg text-muted-foreground">
              {copy.hero.description}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="group bg-gradient-to-r from-[#174940] to-[#2D6A5F] hover:from-[#2D6A5F] hover:to-[#174940] shadow-lg shadow-[#174940]/20 transition-all hover:shadow-xl hover:shadow-[#174940]/30"
              >
                <Link href="/app/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="group border-2 border-[#174940]/20 hover:border-[#174940] hover:bg-[#174940]/5">
                <Link href="/modules">
                  Explore Modules
                  <Sparkles className="ml-2 h-5 w-5 text-[#174940] transition-transform group-hover:rotate-12" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-md">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">No credit card required</span>
              </div>
            </div>
          </FadeIn>

          {/* Right: Futuristic Dashboard Preview */}
          <FadeIn delay={200} direction="left" className="relative flex items-center justify-center">
            <div className="relative w-full max-w-2xl">
              {/* Outer glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#174940]/30 via-[#48A999]/20 to-[#2D6A5F]/30 blur-3xl"></div>

              {/* Main dashboard container with 3D effect */}
              <div className="relative transform perspective-1000 hover:scale-[1.02] transition-transform duration-500">
                {/* Glassmorphic dashboard with futuristic frame */}
                <div className="relative rounded-2xl border-2 border-[#48A999]/30 bg-gradient-to-br from-white/70 via-white/50 to-[#E8F5F3]/60 p-6 shadow-2xl backdrop-blur-2xl dark:from-gray-900/70 dark:via-gray-900/50 dark:to-[#174940]/20">
                  {/* Top bar with futuristic elements */}
                  <div className="mb-6 flex items-center justify-between rounded-xl border border-[#48A999]/20 bg-gradient-to-r from-[#174940]/10 to-[#48A999]/10 p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5">
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-lg shadow-red-500/50"></div>
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-500/50"></div>
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-500/50"></div>
                      </div>
                      <div className="h-4 w-px bg-gradient-to-b from-transparent via-[#174940]/30 to-transparent"></div>
                      <Sparkles className="h-4 w-4 text-[#48A999] animate-pulse" />
                      <span className="bg-gradient-to-r from-[#174940] to-[#48A999] bg-clip-text text-sm font-bold text-transparent">
                        SMOS
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-3 py-1.5 shadow-inner">
                      <div className="relative h-2 w-2">
                        <div className="absolute h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">LIVE</span>
                    </div>
                  </div>

                  {/* Futuristic metric cards */}
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Active Batches', value: '24', trend: '+12%', color: 'from-blue-500 via-blue-600 to-cyan-500', glow: 'shadow-blue-500/50' },
                      { label: 'Open Quotes', value: '18', trend: '$156k', color: 'from-purple-500 via-purple-600 to-pink-500', glow: 'shadow-purple-500/50' },
                      { label: 'Gross Margin', value: '62%', trend: '↑ 2%', color: 'from-green-500 via-emerald-600 to-teal-500', glow: 'shadow-green-500/50' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br from-white/80 to-white/40 p-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl dark:border-gray-700/40 dark:from-gray-800/80 dark:to-gray-800/40"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        {/* Animated gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 transition-opacity duration-300 group-hover:opacity-20`}></div>

                        {/* Corner accent */}
                        <div className={`absolute right-0 top-0 h-8 w-8 bg-gradient-to-br ${item.color} opacity-20 blur-xl`}></div>

                        <div className="relative">
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {item.label}
                          </div>
                          <div className={`mb-1 text-2xl font-bold bg-gradient-to-br ${item.color} bg-clip-text text-transparent`}>
                            {item.value}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${item.color}`}></div>
                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">{item.trend}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Futuristic activity feed */}
                  <div className="rounded-xl border border-white/40 bg-gradient-to-br from-white/60 to-white/30 p-4 backdrop-blur-sm dark:border-gray-700/40 dark:from-gray-800/60 dark:to-gray-800/30">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[#48A999]" />
                        <span className="text-sm font-semibold">Real-Time Activity</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="h-1 w-1 rounded-full bg-[#174940] animate-pulse"></div>
                        <div className="h-1 w-1 rounded-full bg-[#2D6A5F] animate-pulse" style={{animationDelay: '200ms'}}></div>
                        <div className="h-1 w-1 rounded-full bg-[#48A999] animate-pulse" style={{animationDelay: '400ms'}}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { text: 'Batch B-2847 → Packaging', icon: TrendingUp, color: 'from-green-500 to-emerald-600', glow: 'shadow-green-500/30' },
                        { text: 'Quote Q-1456 → Wellness Corp', icon: Users, color: 'from-purple-500 to-pink-600', glow: 'shadow-purple-500/30' },
                        { text: 'Alert: Hyaluronic Acid Low', icon: Sparkles, color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/30' },
                      ].map((item, i) => (
                        <div key={i} className="group flex items-center gap-3 rounded-lg bg-gradient-to-r from-white/80 to-white/40 p-2.5 transition-all hover:from-white/90 hover:to-white/50 hover:shadow-md dark:from-gray-900/80 dark:to-gray-900/40">
                          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-lg ${item.glow} transition-transform group-hover:scale-110`}>
                            <item.icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-xs font-medium">{item.text}</span>
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#48A999] opacity-0 transition-opacity group-hover:opacity-100"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating orbs with animations */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-[#48A999] to-[#2D6A5F] opacity-40 blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#174940] to-[#48A999] opacity-40 blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute right-1/4 top-1/4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-2xl animate-pulse" style={{animationDelay: '1.5s'}}></div>

              {/* Scanning line effect */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#48A999] to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
