import { Link } from 'wouter';
import { ArrowUpRight, Command, Mail, Shield } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';

export default function AboutPage() {
  const founders = [
    {
      name: 'Saran S U',
      headline: 'AI Engineer | Python Developer | Web Developer',
      skills: ['AI Engineering', 'Python Development', 'Web Development'],
      interests: 'Artificial Intelligence, Python applications, web development, AI-powered products, startup building',
      email: 'founderbrainofficial@gmail.com',
    },
    {
      name: 'Sri Ranjan S',
      headline: 'Cybersecurity Engineer | Network Security | Ethical Hacking Specialist',
      skills: ['Cybersecurity Engineering', 'Network Security', 'Ethical Hacking'],
      interests: 'Cybersecurity, network defense, security engineering, ethical hacking, secure application development',
      email: 'founderbrainofficial@gmail.com',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/70 bg-card/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="Founderbrain home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Command className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Founderbrain</span>
              <span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">About</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Navigation">
            <Link href="/founders" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Founder Network
            </Link>
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Building the future of <span className="text-primary">founder work</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            FounderBrain is a calm, private workspace for founders to keep projects moving,
            goals in view, and connect with other builders.
          </p>
        </section>

        {/* Founders Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Our Team</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {founders.map((founder, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-secondary text-xl font-semibold text-primary">
                      {founder.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold truncate">{founder.name}</h3>
                        <Badge variant="secondary" className="shrink-0">
                          <Shield className="mr-1 h-3 w-3" />
                          Founder
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{founder.headline}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {founder.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interests</p>
                    <p className="mt-1 text-sm text-muted-foreground">{founder.interests}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <a
                      href={`mailto:${founder.email}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {founder.email}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-12 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Get in Touch</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Have questions about FounderBrain? We'd love to hear from you.
          </p>
          <div className="mt-4">
            <Button asChild>
              <a href="mailto:founderbrainofficial@gmail.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </a>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">What FounderBrain Offers</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Projects & Tasks', desc: 'Organize your work with projects, tasks, and goals that keep you focused.' },
              { title: 'Founder Network', desc: 'Discover other founders, connect with potential co-founders, and grow together.' },
              { title: 'Community', desc: 'Share lessons, ask questions, and learn from the founder community.' },
              { title: 'Mentorship', desc: 'Get grounded advice from experienced founders and mentors.' },
              { title: 'Fundraising', desc: 'Track your investor pipeline and manage fundraising conversations.' },
              { title: 'AI Assistant', desc: 'Get AI-powered insights for idea validation and business planning.' },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to build?</h2>
          <p className="mt-2 text-muted-foreground">
            Join other founders who are building the future.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup">Create your account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/founders">
                Explore the network
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} FounderBrain. Built for founders, by founders.</p>
        <p className="mt-1">Your workspace is private to you.</p>
      </footer>
    </div>
  );
}