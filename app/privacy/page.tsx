import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Deutsch Coach",
  description: "How Deutsch Coach protects learner data and speech practice.",
};

export default function PrivacyPage() {
  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Deutsch Coach">
        <Link className="public-brand" href="/">
          <span className="brand-mark small" aria-hidden="true">DE</span>
          <span>Deutsch Coach</span>
        </Link>
        <Link className="public-nav-link" href="/support">Support</Link>
      </nav>

      <header className="public-hero">
        <p className="eyebrow">Privacy by default</p>
        <h1>Your learning stays yours.</h1>
        <p>
          Deutsch Coach is designed to teach German without advertising, cross-app
          tracking, or selling learner data.
        </p>
        <small>Effective 02.08.2026</small>
      </header>

      <div className="public-content">
        <section>
          <h2>Data stored on your iPhone</h2>
          <p>
            Lesson completion, review schedules, scores, streaks, learning settings,
            marked vocabulary, and aggregate product milestones are stored locally on
            your device. Anonymous improvement sharing is off by default. If you enable
            it in Settings, Deutsch Coach receives only the milestone name and app build
            and adds it to a daily total. No account or device identifier is sent. The
            app never uploads your name, answers, study history, transcripts, or voice
            recordings with these totals or curriculum updates.
          </p>
        </section>

        <section>
          <h2>Speech practice</h2>
          <p>
            When you choose microphone practice, Apple speech recognition may process
            your audio according to your device settings and Apple&apos;s privacy terms.
            Generated German audio runs privately on the device. Deutsch Coach does
            not store or send speech recordings to the curriculum service.
          </p>
        </section>

        <section>
          <h2>Curriculum updates</h2>
          <p>
            The app checks the Deutsch Coach content service for signed curriculum
            versions and downloads verified lesson files. These requests contain the
            file version and app build needed for compatibility, not your learning
            answers or identity.
          </p>
        </section>

        <section>
          <h2>Purchases and organization access</h2>
          <p>
            Apple processes App Store subscriptions and purchase history. A school or
            partner can activate full access using a random Access ID. Only a one-way
            hash and the last characters of that ID are stored; it is not linked to
            your name, progress, answers, or recordings.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            Microphone and notification permissions are optional. You can reset all
            learning progress from Settings. You can manage or cancel subscriptions in
            your Apple Account. Deutsch Coach contains no third-party advertising or
            tracking SDK. You can turn anonymous improvement sharing off at any time;
            this stops all future milestone reporting.
          </p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>
            Deutsch Coach is operated by Fayse Burns. For a privacy request or question,
            email fayseburns@gmail.com or visit the support page. Requests are handled
            without asking for passwords, payment details, or your private Access ID.
          </p>
          <Link className="public-button" href="/support">Open support</Link>
        </section>
      </div>
    </main>
  );
}
