'use client';

import { Metadata } from 'next';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Mail, MessageSquare, Phone, MapPin } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { copy } from '@/data/copy';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-background to-muted/50 px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Get In Touch
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Have questions? Want a personalized demo? Our team is here to help you find the perfect solution.
          </p>
        </div>
      </section>

      {/* Contact Methods & Form */}
      <section className="border-b px-4 py-16">
        <div className="container mx-auto">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Contact Methods */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <Mail className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-semibold">Email Us</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Get a response within 24 hours
                </p>
                <a href="mailto:hello@curecore.com" className="text-sm text-[#174940] hover:underline">
                  hello@curecore.com
                </a>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <MessageSquare className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-semibold">Live Chat</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Chat with our team in real-time
                </p>
                <button className="text-sm text-[#174940] hover:underline">
                  Start a conversation
                </button>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <Phone className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-semibold">Schedule a Call</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Book a personalized demo
                </p>
                <a href="#" className="text-sm text-[#174940] hover:underline">
                  View available times
                </a>
              </Card>

              <Card className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#174940]/10">
                  <MapPin className="h-6 w-6 text-[#174940]" />
                </div>
                <h3 className="mb-2 font-semibold">Visit Us</h3>
                <p className="text-sm text-muted-foreground">
                  123 Innovation Way
                  <br />
                  San Francisco, CA 94103
                  <br />
                  United States
                </p>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8">
                {submitted ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-2xl font-bold">Thank You!</h3>
                    <p className="mb-6 text-muted-foreground">
                      We've received your message and will get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-6 text-2xl font-bold">Send Us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            required
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            required
                            placeholder="john@company.com"
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => handleChange('company', e.target.value)}
                            placeholder="Your Company Name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="teamSize">Team Size</Label>
                          <Input
                            id="teamSize"
                            value={formData.teamSize}
                            onChange={(e) => handleChange('teamSize', e.target.value)}
                            placeholder="e.g., 5-10 people"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => handleChange('message', e.target.value)}
                          required
                          rows={6}
                          placeholder="Tell us about your needs, questions, or how we can help..."
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-[#174940] hover:bg-[#174940]/90"
                      >
                        Send Message
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        By submitting this form, you agree to our Privacy Policy and Terms of Service.
                      </p>
                    </form>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Quick answers to common questions
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-4">
              {copy.faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-lg border bg-background px-6">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
}
