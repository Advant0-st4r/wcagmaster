import { useEffect } from 'react';
import { Shield, Zap, Lock } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { Hero } from '@/components/Hero';
import { ValueCard } from '@/components/ValueCard';
import { analytics } from '@/lib/analytics';

const Landing = () => {
  useEffect(() => {
    analytics.page('Landing');
  }, []);

  const values = [
    {
      icon: Shield,
      title: 'Secure by Design',
      description: 'End-to-end encryption ensures your code never leaves our secure environment unprotected.',
    },
    {
      icon: Zap,
      title: 'Fast Turnaround',
      description: 'Get comprehensive feedback in minutes, not days. Ship faster with confidence.',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'GDPR compliant with zero data retention policies. Your IP stays yours.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAuthenticated={false} />
      
      <main>
        <Hero />

        <section className="container mx-auto px-4 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <ValueCard key={value.title} {...value} />
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-8 text-center text-sm text-muted-foreground">
              <span>SOC 2 Type II Certified</span>
              <span>•</span>
              <span>ISO 27001 Compliant</span>
              <span>•</span>
              <span>GDPR Ready</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SecureCode. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
