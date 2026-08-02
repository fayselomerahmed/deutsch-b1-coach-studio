"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type SignedInUser = { displayName: string; email: string };
type PublishedFile = {
  fileName: string;
  version: number;
  minimumBuild: number;
  publishedAt: number;
  canRollback: boolean;
};

type DashboardStatus = {
  requiresActivation: boolean;
  files: PublishedFile[];
};

const managedFiles = [
  { fileName: "grammar", title: "Grammar", detail: "Rules, examples, mistakes, and exercises", color: "blue" },
  { fileName: "vocab_a1", title: "A1 vocabulary", detail: "Starter words, articles, plurals, examples, and audio text", color: "coral" },
  { fileName: "vocab_a2", title: "A2 vocabulary", detail: "Everyday independent language and visual examples", color: "green" },
  { fileName: "vocab_b1", title: "B1 vocabulary", detail: "Integration, work, exam, and real-life vocabulary", color: "gold" },
  { fileName: "lessons", title: "Lessons", detail: "Course sequence, scenarios, practice, and recap", color: "blue" },
  { fileName: "quizzes", title: "Quizzes", detail: "Questions, choices, answers, and explanations", color: "coral" },
  { fileName: "practical_missions", title: "Real-life missions", detail: "Role-play scenarios and model responses", color: "green" },
  { fileName: "everyday_phrases", title: "Everyday phrases", detail: "Phrasebook categories and high-frequency phrases", color: "gold" },
] as const;

export function AdminPortal({ user }: { user: SignedInUser | null }) {
  const [dashboard, setDashboard] = useState<DashboardStatus | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [minimumBuild, setMinimumBuild] = useState(1);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/admin/status", { cache: "no-store" });
    const payload = (await response.json()) as DashboardStatus & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "The dashboard could not be loaded.");
    setDashboard(payload);
  }, [user]);

  useEffect(() => {
    loadDashboard().catch((error: Error) => setNotice({ kind: "error", text: error.message }));
  }, [loadDashboard]);

  const publishedByName = useMemo(
    () => new Map((dashboard?.files ?? []).map((file) => [file.fileName, file])),
    [dashboard],
  );

  async function activate() {
    setIsActivating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activationCode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Activation failed.");
      setActivationCode("");
      await loadDashboard();
      setNotice({ kind: "success", text: "Ownership activated. This account now controls live publishing." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Activation failed." });
    } finally {
      setIsActivating(false);
    }
  }

  async function publishFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const expectedName = file.name.toLowerCase().endsWith(".json")
      ? file.name.slice(0, -5)
      : "";
    if (!managedFiles.some((item) => item.fileName === expectedName)) {
      setNotice({ kind: "error", text: "Use one of the exact JSON filenames shown below." });
      return;
    }

    setBusyFile(expectedName);
    setNotice(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const payloadBase64 = bytesToBase64(bytes);
      const sha256 = await digestHex(bytes);
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: expectedName, payloadBase64, sha256, minimumBuild }),
      });
      const payload = (await response.json()) as { error?: string; itemCount?: number };
      if (!response.ok) throw new Error(payload.error ?? "Publishing failed.");
      await loadDashboard();
      setNotice({
        kind: "success",
        text: `${file.name} is live with ${formatNumber(payload.itemCount ?? 0)} curriculum items.`,
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Publishing failed." });
    } finally {
      setBusyFile(null);
    }
  }

  async function runFileAction(fileName: string, action: "rollback" | "remove") {
    const confirmation = action === "remove"
      ? window.confirm("Remove this live file and return learners to the version bundled with their app?")
      : window.confirm("Restore the previous published version for all learners?");
    if (!confirmation) return;

    setBusyFile(fileName);
    setNotice(null);
    try {
      const response = action === "rollback"
        ? await fetch("/api/admin/content/rollback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName }),
          })
        : await fetch(`/api/admin/content?file_name=${encodeURIComponent(fileName)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The change was not applied.");
      await loadDashboard();
      setNotice({
        kind: "success",
        text: action === "rollback" ? "The previous version is live again." : "The app will now use its bundled version.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The change was not applied." });
    } finally {
      setBusyFile(null);
    }
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="signin-title">
          <div className="brand-mark" aria-hidden="true">DC</div>
          <p className="eyebrow">Deutsch Coach</p>
          <h1 id="signin-title">Content Studio</h1>
          <p className="lead">Secure owner access for publishing curriculum updates to the iPhone app.</p>
          <a className="primary-button" href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT</a>
          <p className="privacy-note">Only the activated owner account can change live content.</p>
        </section>
      </main>
    );
  }

  if (dashboard?.requiresActivation) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="activate-title">
          <div className="brand-mark" aria-hidden="true">DC</div>
          <p className="eyebrow">One-time setup</p>
          <h1 id="activate-title">Activate owner access</h1>
          <p className="lead">Signed in as <strong>{user.email}</strong></p>
          <label className="field-label" htmlFor="activation-code">Activation code</label>
          <input
            id="activation-code"
            className="text-input"
            value={activationCode}
            onChange={(event) => setActivationCode(event.target.value)}
            autoComplete="one-time-code"
          />
          <button className="primary-button" onClick={activate} disabled={isActivating || !activationCode.trim()}>
            {isActivating ? "Activating…" : "Activate this account"}
          </button>
          {notice && <Notice notice={notice} />}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark small" aria-hidden="true">DC</div>
          <div>
            <p className="eyebrow">Deutsch Coach</p>
            <h1>Live Content</h1>
          </div>
        </div>
        <div className="account-block">
          <span>{user.email}</span>
          <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
        </div>
      </header>

      <section className="status-band" aria-label="Backend status">
        <div>
          <span className="live-dot" aria-hidden="true" />
          <strong>Backend online</strong>
          <span>{formatNumber(dashboard?.files.length ?? 0)} of {formatNumber(managedFiles.length)} files live</span>
        </div>
        <label className="build-control">
          Minimum app build
          <input
            type="number"
            min="1"
            step="1"
            value={minimumBuild}
            onChange={(event) => setMinimumBuild(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
      </section>

      <section className="publish-panel" aria-labelledby="publish-title">
        <div>
          <p className="eyebrow">New update</p>
          <h2 id="publish-title">Publish curriculum JSON</h2>
          <p>The filename selects its course section. The current live file is kept in version history.</p>
        </div>
        <label className={`primary-button upload-button ${busyFile ? "disabled" : ""}`}>
          {busyFile ? "Publishing…" : "Choose JSON file"}
          <input type="file" accept="application/json,.json" onChange={publishFile} disabled={Boolean(busyFile)} />
        </label>
      </section>

      {notice && <Notice notice={notice} />}

      <section className="content-section" aria-labelledby="content-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Curriculum library</p>
            <h2 id="content-title">Managed content</h2>
          </div>
          <button className="quiet-button" onClick={() => loadDashboard()} disabled={Boolean(busyFile)}>Refresh</button>
        </div>

        <div className="content-grid">
          {managedFiles.map((file) => {
            const published = publishedByName.get(file.fileName);
            const isBusy = busyFile === file.fileName;
            return (
              <article className={`content-card ${file.color}`} key={file.fileName}>
                <div className="card-topline">
                  <span className="file-index">{file.title.slice(0, 2).toUpperCase()}</span>
                  <span className={`state-badge ${published ? "live" : "bundled"}`}>
                    {published ? "Live" : "Bundled"}
                  </span>
                </div>
                <div className="card-copy">
                  <h3>{file.title}</h3>
                  <code>{file.fileName}.json</code>
                  <p>{file.detail}</p>
                </div>
                <div className="card-meta">
                  {published ? (
                    <>
                      <span>Published {formatDate(published.publishedAt)}</span>
                      <span>Build {published.minimumBuild}+</span>
                    </>
                  ) : (
                    <span>Uses the content included in the installed app</span>
                  )}
                </div>
                {published && (
                  <div className="card-actions">
                    <button
                      className="secondary-button"
                      onClick={() => runFileAction(file.fileName, "rollback")}
                      disabled={isBusy || !published.canRollback}
                    >
                      {isBusy ? "Working…" : "Roll back"}
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => runFileAction(file.fileName, "remove")}
                      disabled={isBusy}
                    >
                      Use bundled
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Notice({ notice }: { notice: { kind: "success" | "error"; text: string } }) {
  return <div className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div>;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
