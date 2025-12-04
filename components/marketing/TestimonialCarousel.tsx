'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { copy } from '@/data/copy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const testimonials = copy.testimonials;

  const prev = () => {
    setCurrentIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  };

  const next = () => {
    setCurrentIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1));
  };

  const current = testimonials[currentIndex];

  return (
    <section className="border-b bg-muted/50 px-4 py-16 md:py-24">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Trusted by Growing Brands
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            See how CureCore helps manufacturing teams save time and scale faster
          </p>
        </div>

        <Card className="relative mx-auto max-w-4xl p-8 md:p-12">
          <Quote className="absolute left-8 top-8 h-12 w-12 text-[#174940]/20" />

          <div className="relative">
            <blockquote className="mb-6 text-xl font-medium leading-relaxed md:text-2xl">
              "{current.quote}"
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#174940] text-white">
                {current.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold">{current.author}</div>
                <div className="text-sm text-muted-foreground">
                  {current.role} at {current.company}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-[#174940]'
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prev}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={next}
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {Object.entries(copy.stats).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="mb-2 text-4xl font-bold text-[#174940]">{value}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
