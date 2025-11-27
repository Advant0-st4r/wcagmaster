import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Professional Code Review,
          <span className="text-primary"> Simplified</span>
        </h1>
        
        <p className="mb-8 text-lg text-muted-foreground md:text-xl">
          Upload your code, get comprehensive feedback, and ship with confidence.
        </p>

        <Button size="lg" asChild className="group">
          <Link to="/auth">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>

        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required • Secure processing • GDPR compliant
        </p>
      </div>
    </section>
  );
};
