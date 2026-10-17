import { Guidelines } from './parts';

const logoUrl = `${import.meta.env.BASE_URL}founderbrain-horizontal.jpg`;

export function LogoPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
        <div>
          <h2 className="font-semibold">Horizontal mark</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The horizontal FounderBrain logo supplied with the product brief.
          </p>
        </div>
        <div className="flex min-h-32 items-center justify-center rounded-lg border bg-background p-6">
          <img
            src={logoUrl}
            alt="FounderBrain network-brain symbol and wordmark"
            className="h-auto w-full max-w-[360px] rounded-sm"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          This is a crop from a photographed logo board. Use it as a reference
          in this preview; request the original vector or transparent logo file
          before using the mark in production materials.
        </p>
      </section>
    </div>
  );
}

export function BrandGuidelinesPage() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-3">
        <h2 className="font-semibold">Visual principles</h2>
        <p className="text-sm text-muted-foreground">
          Founderbrain should feel premium and capable without losing warmth or
          clarity. Keep the interface distinct rather than reproducing another
          product’s layouts or visual identity.
        </p>
        <Guidelines
          items={[
            {
              kind: 'do',
              text: 'Use warm ivory for primary canvases and deep violet for navigation and key actions.',
            },
            {
              kind: 'do',
              text: 'Reserve gold for small highlights that help users notice important progress or selection.',
            },
            {
              kind: 'do',
              text: 'Keep typography crisp and hierarchy clear so real project information is easy to scan.',
            },
            {
              kind: 'dont',
              text: 'Use large gold surfaces or treat the existing blue logo colors as a replacement for the requested violet palette.',
            },
            {
              kind: 'dont',
              text: 'Copy interface layouts, assets, or brand marks from Linear, Notion, or LinkedIn.',
            },
          ]}
        />
      </section>
    </div>
  );
}

export function ContentGuidelinesPage() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-3">
        <h2 className="font-semibold">Product voice and trust</h2>
        <p className="text-sm text-muted-foreground">
          Be direct, professional, and useful. Tell users what happened and what
          they can do next; never imply that unavailable services are working.
        </p>
        <Guidelines
          items={[
            {
              kind: 'do',
              text: 'Use honest loading, empty, success, and error states tied to the actual operation.',
            },
            {
              kind: 'do',
              text: 'Invite users to create their first real record when their workspace is empty.',
            },
            {
              kind: 'dont',
              text: 'Invent users, posts, metrics, testimonials, investors, mentor responses, or AI results.',
            },
          ]}
        />
      </section>
    </div>
  );
}
