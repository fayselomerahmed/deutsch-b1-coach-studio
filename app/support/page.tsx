import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Deutsch Coach",
  description: "Help with Deutsch Coach lessons, audio, access, and purchases.",
};

const helpItems = [
  {
    title: "Audio or microphone",
    body: "Open iPhone Settings, find Deutsch Coach, and confirm Microphone and Speech Recognition access. In the app, open Settings > German audio to preview the voice and choose a slower speed.",
  },
  {
    title: "Restore a subscription",
    body: "Open Deutsch Coach > Settings > Plans and purchases, then choose Restore Purchases. Make sure the iPhone uses the same Apple Account that made the purchase.",
  },
  {
    title: "School or partner access",
    body: "Open Settings > School or partner access. Copy the private Access ID and send it only to your participating organization, then choose Check access after they activate it.",
  },
  {
    title: "Lessons or progress",
    body: "Pull to refresh the Home screen, then reopen the lesson. Your completed lessons and review queue are stored on the iPhone and continue to work when the live curriculum service is temporarily unavailable.",
  },
];

export default function SupportPage() {
  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Deutsch Coach">
        <Link className="public-brand" href="/">
          <span className="brand-mark small" aria-hidden="true">DE</span>
          <span>Deutsch Coach</span>
        </Link>
        <Link className="public-nav-link" href="/privacy">Privacy</Link>
      </nav>

      <header className="public-hero support">
        <p className="eyebrow">Deutsch Coach support</p>
        <h1>Get back to learning.</h1>
        <p>
          Clear help for lessons, natural German audio, subscriptions, and
          organization access.
        </p>
      </header>

      <div className="public-content support-grid">
        {helpItems.map((item) => (
          <section key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}

        <section>
          <h2>Billing or refund request</h2>
          <p>
            Apple securely handles payments, cancellations, and refund decisions. Use
            Apple&apos;s official purchase support page while signed in with the purchasing
            Apple Account.
          </p>
          <a
            className="public-button"
            href="https://reportaproblem.apple.com/"
            rel="noreferrer"
          >
            Open Apple purchase support
          </a>
        </section>

        <section>
          <h2>Still need help?</h2>
          <p>
            Email Deutsch Coach support with the app version from Settings &gt; About
            and a short description of what happened. Never include passwords, payment
            details, or your private Access ID.
          </p>
          <a className="public-button" href="mailto:fayseburns@gmail.com?subject=Deutsch%20Coach%20Support">
            Email support
          </a>
        </section>
      </div>
    </main>
  );
}
