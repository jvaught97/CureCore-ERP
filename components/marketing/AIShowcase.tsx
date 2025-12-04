'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare, Calculator, Lightbulb, Zap } from 'lucide-react';
import { aiPromptExamples, aiCapabilities } from '@/data/aiPrompts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const capabilityIcons = {
  'message-square': MessageSquare,
  'calculator': Calculator,
  'lightbulb': Lightbulb,
  'zap': Zap,
};

export function AIShowcase() {
  const [selectedCategory, setSelectedCategory] = useState(aiPromptExamples[0].category);
  const currentPrompts = aiPromptExamples.find(c => c.category === selectedCategory)?.prompts || [];

  return (
    <section id="ai" className="border-b bg-gradient-to-b from-muted/50 to-background px-4 py-16 md:py-24">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-[#174940]" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            CureCore AI: Your Manufacturing Copilot
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Ask questions, execute tasks, and get insights—all in plain English.
            No complex menus, no training manuals.
          </p>
        </div>

        {/* AI Capabilities */}
        <div className="mb-12 grid gap-6 md:grid-cols-4">
          {aiCapabilities.map((capability, index) => {
            const Icon = capabilityIcons[capability.icon as keyof typeof capabilityIcons];
            return (
              <Card key={index} className="p-4 text-center">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#174940]/10">
                  <Icon className="h-5 w-5 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-semibold">{capability.title}</h3>
                <p className="text-sm text-muted-foreground">{capability.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Interactive Prompt Examples */}
        <Card className="overflow-hidden p-6">
          <h3 className="mb-4 text-xl font-bold">Try These Commands</h3>

          {/* Category Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {aiPromptExamples.map((category) => (
              <Badge
                key={category.category}
                variant={selectedCategory === category.category ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedCategory === category.category
                    ? 'bg-[#174940] hover:bg-[#174940]/90'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedCategory(category.category)}
              >
                {category.category}
              </Badge>
            ))}
          </div>

          {/* Prompts */}
          <div className="space-y-3">
            {currentPrompts.map((prompt, index) => (
              <div
                key={index}
                className="group flex items-start gap-3 rounded-lg border bg-background p-4 transition-all hover:border-[#174940] hover:shadow-md"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#174940]/10 group-hover:bg-[#174940] group-hover:text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{prompt}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    AI will execute this instantly
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
