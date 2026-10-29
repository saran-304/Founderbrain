import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, Command, Rocket, Users, Target, Zap, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';

export default function LandingPage() {
  const features = [
    {
      icon: Target,
      title: 'Founder Workspace',
      description: 'Organize your startup goals, projects, and tasks in one focused private workspace.',
    },
    {
      icon: Users,
      title: 'Founder Discovery',
      description: 'Find co-founders, mentors, and collaborators who complement your skills and vision.',
    },
    {
      icon: Zap,
      title: 'AI-Powered Insights',
      description: 'Get structured guidance for idea validation, business planning, and pitch preparation.',
    },
    {
      icon: Rocket,
      title: 'Startup Profiles',
      description: 'Showcase your journey, achievements, and progress to potential partners and investors.',
    },
    {
      icon: ShieldCheck,
      title: 'Private by Design',
      description: 'Your workspace is private to you. Control what you share and with whom.',
    },
    {
      icon: CheckCircle2,
      title: 'Progress Tracking',
      description: 'See your momentum with clear metrics on projects, tasks, and goal completion.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Your Profile',
      description: 'Set up your founder profile with your skills, interests, and startup stage.',
    },
    {
      number: '02',
      title: 'Organize Your Work',
      description: 'Add projects, tasks, and goals to track your startup progress.',
    },
    {
      number: '03',
      title: 'Connect & Grow',
      description: 'Discover founders, join the community, and move your startup forward.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="FounderBrain home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Command className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">FounderBrain</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </Link>
            <Link href="/feedback" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Feedback
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Built for founders, by founders
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Build Your Startup.{' '}
                <span className="text-primary">Find Your People.</span>{' '}
                Move Forward.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
                Bring your startup goals, projects, AI tools, collaborators, and founder community together in one calm, private workspace.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base">
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base">
                  <Link href="/about">
                    Explore the Platform
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                No credit card required. Start building today.
              </p>
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section className="py-16 sm:py-24 border-t border-border/70">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your Founder Operating System
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to organize your startup journey in one place.
              </p>
            </div>
            <Card className="mx-auto max-w-5xl overflow-hidden border-2 border-border/50">
              <CardContent className="p-0">
                <div className="bg-muted/50 border-b border-border/70 p-4 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                    <div className="h-3 w-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs font-medium text-muted-foreground">founderbrain.app/dashboard</span>
                  </div>
                </div>
                <div className="p-8 sm:p-12 bg-gradient-to-br from-background to-muted/20">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Projects', description: 'Track startup initiatives' },
                      { label: 'Tasks', description: 'Manage action items' },
                      { label: 'Goals', description: 'Set measurable objectives' },
                      { label: 'Team', description: 'Collaborate securely' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg border bg-card p-4">
                        <div className="text-2xl font-semibold">—</div>
                        <div className="mt-1 text-sm font-medium">{metric.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{metric.description}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Sign up to start tracking your startup progress
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 border-t border-border/70">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything Founders Need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From idea to launch, FounderBrain helps you stay organized and connected.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 sm:py-24 border-t border-border/70 bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Get started in three simple steps.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative">
                  <div className="mb-4 text-5xl font-bold text-primary/20">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community & Feedback Wall Preview */}
        <section className="py-16 sm:py-24 border-t border-border/70">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Community
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
                  Join the Founder Community
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Share lessons, ask questions, and learn from other founders building the future.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Public Feedback Wall</div>
                  <div className="text-sm text-muted-foreground">Share feedback and ideas with the community.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Founder Discussions</div>
                  <div className="text-sm text-muted-foreground">Join conversations about startup challenges.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Mentorship Opportunities</div>
                  <div className="text-sm text-muted-foreground">Connect with experienced founders and mentors.</div>
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <Button asChild variant="outline">
                    <Link href="/about">
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Card className="border-2 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm font-medium mb-4">Community Features</div>
                  <div className="space-y-4">
                    {[
                      { title: 'Founder Network', description: 'Discover and connect with co-founders' },
                      { title: 'Feedback Wall', description: 'Share ideas and get community input' },
                      { title: 'Mentorship', description: 'Connect with experienced founders' },
                    ].map((feature) => (
                      <div key={feature.title} className="flex items-start gap-3 pb-4 border-b border-border/70 last:border-0 last:pb-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{feature.title}</div>
                          <div className="text-sm text-muted-foreground">{feature.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 border-t border-border/70 bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Common questions about FounderBrain
              </p>
            </div>
            <div className="mx-auto max-w-3xl space-y-4">
              {[
                {
                  question: 'Is FounderBrain free to use?',
                  answer: 'FounderBrain offers a free tier to get started with essential features. Premium features and AI assistant usage may require a paid plan.',
                },
                {
                  question: 'How does the AI assistant work?',
                  answer: 'The AI assistant uses Google Gemini to help with idea validation, business planning, product roadmaps, and pitch preparation. You need a valid Gemini API key to use this feature.',
                },
                {
                  question: 'Is my data private and secure?',
                  answer: 'Yes. Your workspace is private by default. Row-Level Security ensures only you can access your data. You control what you share publicly through your portfolio.',
                },
                {
                  question: 'Can I use FounderBrain for team collaboration?',
                  answer: 'Yes. You can create workspaces, invite team members, assign roles, and collaborate on projects, tasks, and goals with built-in access controls.',
                },
                {
                  question: 'Do I need technical skills to use FounderBrain?',
                  answer: 'No. FounderBrain is designed for founders of all technical backgrounds. The interface is intuitive and focused on startup planning and management.',
                },
              ].map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24 border-t border-border/70 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4">
              Ready to Build Your Startup?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of founders who are turning their ideas into reality with FounderBrain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="text-base">
                <Link href="/signup">
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/about">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="h-4 w-4" />
                </span>
                <span className="font-semibold">FounderBrain</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A calm, private workspace for founders to build their startups.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-foreground">How It Works</Link></li>
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">Founder Network</Link></li>
                <li><Link href="/about" className="hover:text-foreground">Feedback Wall</Link></li>
                <li><Link href="/about" className="hover:text-foreground">Mentorship</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:founderbrainofficial@gmail.com" className="flex items-center gap-2 hover:text-foreground">
                    <Mail className="h-4 w-4" />
                    founderbrainofficial@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/70 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} FounderBrain. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Private by Design</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
