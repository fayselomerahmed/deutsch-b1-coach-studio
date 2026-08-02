"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  deepClone,
  fieldHelp,
  fieldLabels,
  itemTemplates,
  managedFiles,
  selectOptions,
  validateContentCollection,
  type JsonObject,
  type JsonValue,
  type SupportedContentFile,
} from "../lib/content-catalog";

type SignedInUser = { displayName: string; email: string };
type PublishedFile = {
  fileName: string;
  version: number;
  minimumBuild: number;
  publishedAt: number;
  canRollback: boolean;
};
type DashboardStatus = { requiresActivation: boolean; files: PublishedFile[] };
type NoticeState = { kind: "success" | "error"; text: string };
type EditorState = { originalId: string | null; value: JsonObject };
type LiveRecord = { file_name: string; version: number; payload_base64: string };
type Entitlement = {
  subjectHash: string;
  accessSuffix: string;
  label: string;
  accessLevel: "trial" | "full";
  expiresAt: number | null;
  enabled: boolean;
  status: "active" | "expired" | "disabled";
  updatedAt: number;
};
type MetricRow = {
  day: string;
  event: string;
  count: number;
};

export function AdminPortal({ user }: { user: SignedInUser | null }) {
  const [dashboard, setDashboard] = useState<DashboardStatus | null>(null);
  const [activationCode, setActivationCode] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/admin/status", { cache: "no-store" });
    const payload = (await response.json()) as DashboardStatus & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "The dashboard could not be loaded.");
    setDashboard(payload);
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard().catch((error: Error) => setNotice({ kind: "error", text: error.message }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

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
      setNotice({ kind: "success", text: "Owner access is active. This account now controls live curriculum." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Activation failed." });
    } finally {
      setIsActivating(false);
    }
  }

  if (!user) return <SignInScreen />;

  if (dashboard?.requiresActivation) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="activate-title">
          <BrandMark />
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
            {isActivating ? "Activating..." : "Activate this account"}
          </button>
          {notice && <Notice notice={notice} />}
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return <main className="loading-shell"><span className="loading-pulse" />Preparing your curriculum...</main>;
  }

  return (
    <CurriculumWorkspace
      user={user}
      dashboard={dashboard}
      refreshDashboard={loadDashboard}
      initialNotice={notice}
    />
  );
}

function CurriculumWorkspace({
  user,
  dashboard,
  refreshDashboard,
  initialNotice,
}: {
  user: SignedInUser;
  dashboard: DashboardStatus;
  refreshDashboard: () => Promise<void>;
  initialNotice: NoticeState | null;
}) {
  const [selectedFile, setSelectedFile] = useState<SupportedContentFile>("lessons");
  const [items, setItems] = useState<JsonObject[]>([]);
  const [source, setSource] = useState<"live" | "included">("included");
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [minimumBuild, setMinimumBuild] = useState(1);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(initialNotice);
  const [workspaceMode, setWorkspaceMode] = useState<"curriculum" | "metrics" | "access">("curriculum");

  const publishedByName = useMemo(
    () => new Map(dashboard.files.map((file) => [file.fileName, file])),
    [dashboard.files],
  );
  const selectedConfig = managedFiles.find((file) => file.fileName === selectedFile)!;
  const published = publishedByName.get(selectedFile);

  const loadCollection = useCallback(async (fileName: SupportedContentFile) => {
    setIsLoading(true);
    setNotice(null);
    try {
      const liveResponse = await fetch(
        `/rest/v1/app_content?select=file_name,version,payload_base64&file_name=in.(${encodeURIComponent(fileName)})`,
        { cache: "no-store" },
      );
      if (!liveResponse.ok) throw new Error("The live curriculum could not be read.");
      const records = (await liveResponse.json()) as LiveRecord[];
      let parsed: unknown;
      if (records[0]?.payload_base64) {
        parsed = JSON.parse(decodeBase64(records[0].payload_base64));
        setSource("live");
      } else {
        const includedResponse = await fetch(`/curriculum/${fileName}.json`, { cache: "force-cache" });
        if (!includedResponse.ok) throw new Error("The app's included curriculum could not be loaded.");
        parsed = await includedResponse.json();
        setSource("included");
      }
      setItems(validateContentCollection(fileName, parsed));
      setDirty(false);
      setSearch("");
      setLevel("All");
    } catch (error) {
      setItems([]);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The curriculum could not be loaded." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCollection(selectedFile); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCollection, selectedFile]);

  const levels = useMemo(() => {
    const values = new Set(items.map((item) => String(item.level ?? "")).filter(Boolean));
    return ["All", ...["A1", "A2", "B1"].filter((value) => values.has(value))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de-DE");
    return items.filter((item) => {
      if (level !== "All" && item.level !== level) return false;
      if (!query) return true;
      return searchableText(item).toLocaleLowerCase("de-DE").includes(query);
    });
  }, [items, level, search]);

  function chooseSection(fileName: SupportedContentFile) {
    if (fileName === selectedFile) return;
    if (dirty && !window.confirm("Discard the unpublished changes in this section?")) return;
    setEditor(null);
    setSelectedFile(fileName);
  }

  function createItem() {
    const value = deepClone(itemTemplates[selectedFile]);
    value.id = uniqueId(selectedFile, items);
    if ("order" in value) value.order = nextOrder(items);
    if (selectedFile === "everyday_phrases" && Array.isArray(value.phrases)) {
      (value.phrases[0] as JsonObject).id = uniqueNestedPhraseId(items);
    }
    setEditor({ originalId: null, value });
  }

  function saveDraftItem(nextItem: JsonObject) {
    try {
      const nextItems = editor?.originalId
        ? items.map((item) => item.id === editor.originalId ? nextItem : item)
        : [...items, nextItem];
      validateContentCollection(selectedFile, nextItems);
      setItems(nextItems);
      setDirty(true);
      setEditor(null);
      setNotice({ kind: "success", text: `Draft saved. Publish ${selectedConfig.title.toLowerCase()} when it is ready for learners.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Check the required fields." });
    }
  }

  function removeItem(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || !window.confirm(`Remove “${itemTitle(item)}” from this section? It will not affect learners until you publish.`)) return;
    setItems(items.filter((candidate) => candidate.id !== id));
    setDirty(true);
    setNotice({ kind: "success", text: "Removed from the draft. Publish to apply this change in the app." });
  }

  function duplicateItem(item: JsonObject) {
    const value = deepClone(item);
    value.id = uniqueId(selectedFile, items);
    if ("order" in value) value.order = nextOrder(items);
    if (selectedFile === "everyday_phrases" && Array.isArray(value.phrases)) {
      value.phrases = value.phrases.map((phrase) => ({ ...(phrase as JsonObject), id: uniqueNestedPhraseId(items) }));
    }
    setEditor({ originalId: null, value });
  }

  async function publishCurrent() {
    setIsPublishing(true);
    setNotice(null);
    try {
      validateContentCollection(selectedFile, items);
      const bytes = new TextEncoder().encode(JSON.stringify(items));
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile,
          payloadBase64: bytesToBase64(bytes),
          sha256: await digestHex(bytes),
          minimumBuild,
        }),
      });
      const payload = (await response.json()) as { error?: string; itemCount?: number };
      if (!response.ok) throw new Error(payload.error ?? "Publishing failed.");
      setDirty(false);
      setSource("live");
      await refreshDashboard();
      setNotice({
        kind: "success",
        text: `${formatNumber(payload.itemCount ?? items.length)} items are live. The app will refresh them automatically.`,
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Publishing failed." });
    } finally {
      setIsPublishing(false);
    }
  }

  async function runVersionAction(action: "rollback" | "included") {
    const message = action === "rollback"
      ? "Restore the previous published version for all learners?"
      : "Remove the live version and return learners to the content included with their app?";
    if (!window.confirm(message)) return;
    setIsPublishing(true);
    setNotice(null);
    try {
      const response = action === "rollback"
        ? await fetch("/api/admin/content/rollback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: selectedFile }),
          })
        : await fetch(`/api/admin/content?file_name=${encodeURIComponent(selectedFile)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The change was not applied.");
      await refreshDashboard();
      await loadCollection(selectedFile);
      setNotice({ kind: "success", text: action === "rollback" ? "The previous version is live again." : "The app will use its included version." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The change was not applied." });
    } finally {
      setIsPublishing(false);
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      setItems(validateContentCollection(selectedFile, parsed));
      setDirty(true);
      setNotice({ kind: "success", text: "JSON imported as a draft. Review it, then publish when ready." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "This JSON file could not be imported." });
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedFile}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup">
          <BrandMark small />
          <div><p className="eyebrow">Deutsch Coach</p><h1>Curriculum Studio</h1></div>
        </div>
        <div className="account-block"><span>{user.email}</span><a href="/signout-with-chatgpt?return_to=%2F">Sign out</a></div>
      </header>

      <nav className="workspace-switcher" aria-label="Owner tools">
        <button className={workspaceMode === "curriculum" ? "selected" : ""} onClick={() => setWorkspaceMode("curriculum")}>
          Curriculum
        </button>
        <button className={workspaceMode === "metrics" ? "selected" : ""} onClick={() => setWorkspaceMode("metrics")}>
          Product health
        </button>
        <button className={workspaceMode === "access" ? "selected" : ""} onClick={() => setWorkspaceMode("access")}>
          User access
        </button>
      </nav>

      {workspaceMode === "curriculum" ? (
        <>
          <div className="studio-layout">
        <nav className="section-nav" aria-label="Curriculum sections">
          <div className="nav-heading">
            <span className="live-dot" aria-hidden="true" />
            <div><strong>App connected</strong><small>{formatNumber(dashboard.files.length)} sections customized</small></div>
          </div>
          <div className="nav-scroll">
            {managedFiles.map((file) => (
              <button
                key={file.fileName}
                className={`section-nav-item ${file.accent} ${selectedFile === file.fileName ? "selected" : ""}`}
                onClick={() => chooseSection(file.fileName)}
                aria-current={selectedFile === file.fileName ? "page" : undefined}
              >
                <span className="nav-mark" aria-hidden="true">{file.mark}</span>
                <span><strong>{file.title}</strong><small>{publishedByName.has(file.fileName) ? "Live custom version" : "Included version"}</small></span>
              </button>
            ))}
          </div>
        </nav>

        <section className="workspace" aria-labelledby="workspace-title">
          <div className="workspace-heading">
            <div>
              <div className="workspace-kicker">
                <span className={`state-badge ${source === "live" ? "live" : "bundled"}`}>{source === "live" ? "Live" : "Included"}</span>
                {dirty && <span className="draft-badge">Unpublished changes</span>}
              </div>
              <h2 id="workspace-title">{selectedConfig.title}</h2>
              <p>{selectedConfig.detail}</p>
            </div>
            <button className="publish-button" onClick={publishCurrent} disabled={!dirty || isPublishing || items.length === 0}>
              {isPublishing ? "Checking and publishing..." : "Quality check and publish"}
            </button>
          </div>

          <div className="impact-note">
            <strong>One update, every learner.</strong>
            <span>Publishing checks completeness, teaching depth, and repetition first. Approved changes appear after the app next refreshes.</span>
          </div>

          {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

          <div className="content-toolbar">
            <label className="search-control">
              <span className="sr-only">Search {selectedConfig.title}</span>
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${selectedConfig.title.toLowerCase()}`} />
            </label>
            {levels.length > 1 && (
              <label className="filter-control">
                <span className="sr-only">Filter by CEFR level</span>
                <select value={level} onChange={(event) => setLevel(event.target.value)}>
                  {levels.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
            )}
            <button className="add-button" onClick={createItem}>+ Add {selectedConfig.singular}</button>
          </div>

          <div className="list-summary">
            <strong>{formatNumber(filteredItems.length)} {filteredItems.length === 1 ? "item" : "items"}</strong>
            <span>{search || level !== "All" ? `of ${formatNumber(items.length)} total` : "in this section"}</span>
          </div>

          {isLoading ? (
            <div className="collection-loading"><span className="loading-pulse" />Loading content...</div>
          ) : filteredItems.length ? (
            <div className="record-list">
              {filteredItems.map((item, index) => (
                <article className="record-row" key={String(item.id)}>
                  <button className="record-main" onClick={() => setEditor({ originalId: String(item.id), value: deepClone(item) })}>
                    <span className={`record-number ${selectedConfig.accent}`}>{String(item.level ?? index + 1)}</span>
                    <span className="record-copy">
                      <strong>{itemTitle(item)}</strong>
                      <small>{itemSubtitle(item)}</small>
                    </span>
                    <span className="edit-label">Edit</span>
                  </button>
                  <div className="record-actions">
                    <button onClick={() => duplicateItem(item)} aria-label={`Duplicate ${itemTitle(item)}`}>Duplicate</button>
                    <button className="danger-text" onClick={() => removeItem(String(item.id))} aria-label={`Remove ${itemTitle(item)}`}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No matching content</h3>
              <p>Try another search or level filter.</p>
              <button className="secondary-button" onClick={() => { setSearch(""); setLevel("All"); }}>Clear filters</button>
            </div>
          )}

          <details className="advanced-tools">
            <summary>Version and file tools</summary>
            <div className="advanced-grid">
              <label className="compact-field">Minimum app build<input type="number" min="1" value={minimumBuild} onChange={(event) => setMinimumBuild(Math.max(1, Number(event.target.value) || 1))} /></label>
              <button className="secondary-button" onClick={exportJson}>Export backup</button>
              <label className="secondary-button file-button">Import JSON<input type="file" accept="application/json,.json" onChange={importJson} /></label>
              <button className="secondary-button" onClick={() => loadCollection(selectedFile)} disabled={!dirty}>Discard draft</button>
              <button className="secondary-button" onClick={() => runVersionAction("rollback")} disabled={!published?.canRollback || isPublishing}>Restore previous version</button>
              <button className="danger-button" onClick={() => runVersionAction("included")} disabled={!published || isPublishing}>Use included version</button>
            </div>
            {published && <p>Current version published {formatDate(published.publishedAt)} for app build {published.minimumBuild} and later.</p>}
          </details>
        </section>
          </div>

          {editor && (
            <ContentEditor
              fileName={selectedFile}
              title={`${editor.originalId ? "Edit" : "Add"} ${selectedConfig.singular}`}
              initialValue={editor.value}
              onCancel={() => setEditor(null)}
              onSave={saveDraftItem}
              setNotice={setNotice}
            />
          )}
        </>
      ) : workspaceMode === "metrics" ? (
        <MetricsManager />
      ) : (
        <AccessManager />
      )}
    </main>
  );
}

const metricDefinitions = [
  { event: "onboardingCompleted", label: "Onboardings", detail: "Learners who reached the course" },
  { event: "lessonCompleted", label: "Lessons completed", detail: "Proof of active learning" },
  { event: "speakingCorrectionReceived", label: "Speaking corrections", detail: "High-value speaking moments" },
  { event: "readinessCheckCompleted", label: "Readiness checks", detail: "B1 intent and exam interest" },
  { event: "paywallViewed", label: "Paywall views", detail: "Full-course consideration" },
  { event: "purchaseCompleted", label: "Purchases", detail: "Confirmed by StoreKit" },
] as const;

function MetricsManager() {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/metrics", { cache: "no-store" });
      const payload = (await response.json()) as { rows?: MetricRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Product health could not be loaded.");
      setRows(payload.rows ?? []);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Product health could not be loaded." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMetrics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMetrics]);

  const totals = useMemo(() => {
    const result = new Map<string, number>();
    for (const row of rows) result.set(row.event, (result.get(row.event) ?? 0) + row.count);
    return result;
  }, [rows]);
  const dailyLearning = useMemo(() => {
    const result = new Map<string, number>();
    for (const row of rows) {
      if (row.event === "lessonCompleted") result.set(row.day, (result.get(row.day) ?? 0) + row.count);
    }
    return Array.from(result, ([day, count]) => ({ day, count })).slice(-14);
  }, [rows]);
  const maximumDaily = Math.max(1, ...dailyLearning.map((item) => item.count));
  const paywallViews = totals.get("paywallViewed") ?? 0;
  const purchases = totals.get("purchaseCompleted") ?? 0;
  const purchaseRate = paywallViews > 0 ? purchases / paywallViews : 0;

  return (
    <section className="metrics-workspace" aria-labelledby="metrics-title">
      <div className="metrics-heading">
        <div>
          <p className="eyebrow">90-day aggregate</p>
          <h2 id="metrics-title">Product health</h2>
          <p>Understand the path from first use to learning value and purchase. Counts include only learners who explicitly enabled anonymous improvement sharing.</p>
        </div>
        <button className="secondary-button" onClick={loadMetrics} disabled={isLoading}>Refresh</button>
      </div>

      {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

      {isLoading ? (
        <div className="collection-loading"><span className="loading-pulse" />Loading product health...</div>
      ) : (
        <>
          <div className="metric-grid">
            {metricDefinitions.map((metric) => (
              <article className="metric-card" key={metric.event}>
                <strong>{formatNumber(totals.get(metric.event) ?? 0)}</strong>
                <h3>{metric.label}</h3>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>

          <div className="metric-detail-grid">
            <section className="metric-panel">
              <p className="eyebrow">Decision signal</p>
              <h3>Paywall-to-purchase rate</h3>
              <strong className="metric-rate">{formatPercent(purchaseRate)}</strong>
              <p>Use this with feedback and cohort size. Opt-in totals are directional and should never be treated as a complete census.</p>
            </section>
            <section className="metric-panel">
              <p className="eyebrow">Recent learning</p>
              <h3>Completed lessons by day</h3>
              {dailyLearning.length ? (
                <div className="metric-bars" aria-label="Completed lessons during the last 14 active days">
                  {dailyLearning.map((item) => (
                    <span key={item.day} style={{ height: `${Math.max(12, (item.count / maximumDaily) * 100)}%` }} title={`${formatMetricDay(item.day)}: ${formatNumber(item.count)}`} />
                  ))}
                </div>
              ) : (
                <p className="metric-empty">No opt-in learning totals yet.</p>
              )}
            </section>
          </div>

          <p className="metrics-privacy">No individual events are stored. The database keeps daily totals by app build, with no account, email, device identifier, answers, transcript, or recording.</p>
        </>
      )}
    </section>
  );
}

function AccessManager() {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [accessId, setAccessId] = useState("");
  const [label, setLabel] = useState("");
  const [accessLevel, setAccessLevel] = useState<"trial" | "full">("trial");
  const [trialDays, setTrialDays] = useState(14);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const loadEntitlements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/entitlements", { cache: "no-store" });
      const payload = (await response.json()) as { entitlements?: Entitlement[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "User access could not be loaded.");
      setEntitlements(payload.entitlements ?? []);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "User access could not be loaded." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEntitlements(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEntitlements]);

  async function createAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("new");
    setNotice(null);
    try {
      await saveAccess({ accessId, label, accessLevel, trialDays, enabled: true });
      setAccessId("");
      setLabel("");
      await loadEntitlements();
      setNotice({ kind: "success", text: accessLevel === "full" ? "Full access is active for this learner." : `${trialDays}-day trial access is active.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Access could not be activated." });
    } finally {
      setBusyId(null);
    }
  }

  async function updateAccess(item: Entitlement, change: "full" | "trial" | "extend" | "toggle") {
    setBusyId(item.subjectHash);
    setNotice(null);
    try {
      const body = change === "full"
        ? { subjectHash: item.subjectHash, label: item.label, accessLevel: "full", enabled: true }
        : change === "trial"
          ? { subjectHash: item.subjectHash, label: item.label, accessLevel: "trial", trialDays: 14, enabled: true }
          : change === "extend"
            ? { subjectHash: item.subjectHash, label: item.label, accessLevel: "trial", trialDays: 30, extendTrial: true, enabled: true }
            : { subjectHash: item.subjectHash, label: item.label, accessLevel: item.accessLevel, preserveExpiry: true, enabled: !item.enabled };
      await saveAccess(body);
      await loadEntitlements();
      setNotice({ kind: "success", text: change === "toggle" ? `Access ${item.enabled ? "paused" : "reactivated"}.` : "Learner access updated." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Access could not be updated." });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAccess(item: Entitlement) {
    if (!window.confirm(`Remove access for ${item.label}? StoreKit purchases will not be affected.`)) return;
    setBusyId(item.subjectHash);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/entitlements?subject_hash=${encodeURIComponent(item.subjectHash)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Access could not be removed.");
      await loadEntitlements();
      setNotice({ kind: "success", text: "Backend access removed. StoreKit purchases remain valid." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Access could not be removed." });
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = entitlements.filter((item) => item.status === "active").length;
  const trialCount = entitlements.filter((item) => item.status === "active" && item.accessLevel === "trial").length;

  return (
    <section className="access-workspace" aria-labelledby="access-title">
      <div className="access-heading">
        <div>
          <p className="eyebrow">Entitlements</p>
          <h2 id="access-title">User access</h2>
          <p>Activate a time-limited trial or the full version for a specific iPhone without changing App Store purchases.</p>
        </div>
        <div className="access-stats" aria-label="Access summary">
          <span><strong>{formatNumber(activeCount)}</strong> active</span>
          <span><strong>{formatNumber(trialCount)}</strong> trials</span>
        </div>
      </div>

      {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="access-layout">
        <form className="access-form" onSubmit={createAccess}>
          <div className="form-heading">
            <h3>Activate a learner</h3>
            <p>Ask the learner for the Access ID shown on their Premium screen.</p>
          </div>

          <label className="editor-field field-wide">
            <span>Learner name or reference</span>
            <small>For your records only. Avoid unnecessary personal information.</small>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Example: Integration class, learner 12" maxLength={120} required />
          </label>

          <label className="editor-field field-wide">
            <span>Access ID</span>
            <small>The random ID from the learner&apos;s iPhone.</small>
            <input className="access-id-input" value={accessId} onChange={(event) => setAccessId(event.target.value.toUpperCase())} placeholder="DC-1234-ABCD-5678-EF90" autoCapitalize="characters" autoCorrect="off" required />
          </label>

          <fieldset className="access-type-field">
            <legend>Access type</legend>
            <div className="access-type-control">
              <button type="button" className={accessLevel === "trial" ? "selected" : ""} onClick={() => setAccessLevel("trial")}>
                <strong>Trial</strong><small>Ends automatically</small>
              </button>
              <button type="button" className={accessLevel === "full" ? "selected" : ""} onClick={() => setAccessLevel("full")}>
                <strong>Full</strong><small>Active until removed</small>
              </button>
            </div>
          </fieldset>

          {accessLevel === "trial" && (
            <label className="editor-field field-wide">
              <span>Trial length</span>
              <select value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
          )}

          <button className="primary-button" type="submit" disabled={busyId === "new" || !label.trim() || !accessId.trim()}>
            {busyId === "new" ? "Activating..." : `Activate ${accessLevel === "full" ? "full version" : "trial"}`}
          </button>
          <p className="privacy-copy">Access IDs are hashed before storage. The app does not send names, email addresses, study history, or speech recordings.</p>
        </form>

        <div className="access-list-panel">
          <div className="form-heading">
            <h3>Managed learners</h3>
            <p>Trials expire automatically. Full access can be paused or removed at any time.</p>
          </div>

          {isLoading ? (
            <div className="collection-loading compact"><span className="loading-pulse" />Loading access...</div>
          ) : entitlements.length === 0 ? (
            <div className="empty-state compact"><h3>No managed access yet</h3><p>Activate the first learner with the form.</p></div>
          ) : (
            <div className="entitlement-list">
              {entitlements.map((item) => {
                const isBusy = busyId === item.subjectHash;
                return (
                  <article className="entitlement-row" key={item.subjectHash}>
                    <div className="entitlement-main">
                      <div className="entitlement-title">
                        <strong>{item.label}</strong>
                        <span className={`access-badge ${item.status}`}>{item.status}</span>
                      </div>
                      <div className="entitlement-meta">
                        <code>••••-{item.accessSuffix}</code>
                        <span>{item.accessLevel === "full" ? "Full version" : `Trial until ${formatDateOnly(item.expiresAt)}`}</span>
                      </div>
                    </div>
                    <div className="entitlement-actions">
                      {item.accessLevel === "trial" ? (
                        <>
                          <button onClick={() => updateAccess(item, "extend")} disabled={isBusy}>Add 30 days</button>
                          <button onClick={() => updateAccess(item, "full")} disabled={isBusy}>Make full</button>
                        </>
                      ) : (
                        <button onClick={() => updateAccess(item, "trial")} disabled={isBusy}>Change to 14-day trial</button>
                      )}
                      <button onClick={() => updateAccess(item, "toggle")} disabled={isBusy}>{item.enabled ? "Pause" : "Reactivate"}</button>
                      <button className="danger-text" onClick={() => deleteAccess(item)} disabled={isBusy}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

async function saveAccess(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/entitlements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Access could not be saved.");
}

function ContentEditor({
  fileName,
  title,
  initialValue,
  onCancel,
  onSave,
  setNotice,
}: {
  fileName: SupportedContentFile;
  title: string;
  initialValue: JsonObject;
  onCancel: () => void;
  onSave: (value: JsonObject) => void;
  setNotice: (notice: NoticeState) => void;
}) {
  const [value, setValue] = useState<JsonObject>(initialValue);

  function save() {
    const id = String(value.id ?? "").trim();
    if (!id) {
      setNotice({ kind: "error", text: "Add a unique ID before saving this item." });
      return;
    }
    onSave(value);
  }

  return (
    <div className="editor-backdrop" role="presentation">
      <section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-header">
          <div><p className="eyebrow">Curriculum editor</p><h2 id="editor-title">{title}</h2></div>
          <button className="close-button" onClick={onCancel} aria-label="Close editor">×</button>
        </header>
        <div className="editor-intro">
          <strong>Fill in what the learner should see and hear.</strong>
          <span>Changes become a private draft until you publish the whole section.</span>
        </div>
        <div className="editor-body">
          <ObjectFields fileName={fileName} value={value} onChange={setValue} path={[]} />
        </div>
        <footer className="editor-footer">
          <button className="secondary-button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" onClick={save}>Save draft</button>
        </footer>
      </section>
    </div>
  );
}

function ObjectFields({
  fileName,
  value,
  onChange,
  path,
}: {
  fileName: SupportedContentFile;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  path: string[];
}) {
  return (
    <div className={`object-fields ${path.length ? "nested-fields" : ""}`}>
      {Object.entries(value).map(([key, child]) => {
        const nextPath = [...path, key];
        if (Array.isArray(child)) {
          return <ArrayField key={key} fileName={fileName} fieldKey={key} value={child} onChange={(next) => onChange({ ...value, [key]: next })} path={nextPath} />;
        }
        if (child !== null && typeof child === "object") {
          return (
            <section className="nested-section" key={key}>
              <div className="nested-heading"><h3>{labelFor(key)}</h3>{fieldHelp[key] && <p>{fieldHelp[key]}</p>}</div>
              <ObjectFields fileName={fileName} value={child as JsonObject} onChange={(next) => onChange({ ...value, [key]: next })} path={nextPath} />
            </section>
          );
        }
        return <PrimitiveField key={key} fieldKey={key} value={child} onChange={(next) => onChange({ ...value, [key]: next })} />;
      })}
    </div>
  );
}

function PrimitiveField({ fieldKey, value, onChange }: { fieldKey: string; value: JsonValue; onChange: (value: JsonValue) => void }) {
  const help = fieldHelp[fieldKey];
  const options = selectOptions[fieldKey];
  const long = longTextFields.has(fieldKey) || (typeof value === "string" && value.length > 100);
  return (
    <label className={`editor-field ${long ? "field-wide" : ""}`}>
      <span>{labelFor(fieldKey)}</span>
      {help && <small>{help}</small>}
      {options ? (
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option || "none"} value={option}>{option || "No article"}</option>)}
        </select>
      ) : typeof value === "number" ? (
        <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      ) : typeof value === "boolean" ? (
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      ) : long ? (
        <textarea rows={4} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ArrayField({
  fileName,
  fieldKey,
  value,
  onChange,
  path,
}: {
  fileName: SupportedContentFile;
  fieldKey: string;
  value: JsonValue[];
  onChange: (value: JsonValue[]) => void;
  path: string[];
}) {
  const templateValue = templateAtPath(itemTemplates[fileName], path);
  const templateEntry = Array.isArray(templateValue) ? templateValue[0] : undefined;
  const prototype = value[0] ?? templateEntry ?? "";

  function addEntry() {
    onChange([...value, blankShape(prototype, fieldKey)]);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <section className="array-section">
      <div className="array-heading">
        <div><h3>{labelFor(fieldKey)}</h3>{fieldHelp[fieldKey] && <p>{fieldHelp[fieldKey]}</p>}</div>
        <button className="add-small-button" type="button" onClick={addEntry}>+ Add</button>
      </div>
      {value.length === 0 && <p className="array-empty">Nothing added yet.</p>}
      <div className="array-items">
        {value.map((entry, index) => (
          <div className="array-item" key={`${fieldKey}-${index}`}>
            <div className="array-item-toolbar">
              <strong>{singularLabel(fieldKey)} {index + 1}</strong>
              <span>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${singularLabel(fieldKey)} ${index + 1} up`}>Up</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label={`Move ${singularLabel(fieldKey)} ${index + 1} down`}>Down</button>
                <button type="button" className="danger-text" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              </span>
            </div>
            {entry !== null && typeof entry === "object" && !Array.isArray(entry) ? (
              <ObjectFields fileName={fileName} value={entry as JsonObject} onChange={(next) => onChange(value.map((item, itemIndex) => itemIndex === index ? next : item))} path={[...path, String(index)]} />
            ) : (
              <textarea
                rows={fieldKey === "choices" || fieldKey === "vocabularyIds" ? 1 : 2}
                value={String(entry ?? "")}
                aria-label={`${labelFor(fieldKey)} ${index + 1}`}
                onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SignInScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="signin-title">
        <BrandMark />
        <p className="eyebrow">Deutsch Coach</p>
        <h1 id="signin-title">Curriculum Studio</h1>
        <p className="lead">Add, edit, and publish lessons to every connected iPhone from one secure workspace.</p>
        <a className="primary-button" href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT</a>
        <p className="privacy-note">Only the activated owner account can change live content.</p>
      </section>
    </main>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true">DC</div>;
}

function Notice({ notice, onDismiss }: { notice: NoticeState; onDismiss?: () => void }) {
  return (
    <div className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
      <span>{notice.text}</span>
      {onDismiss && <button onClick={onDismiss} aria-label="Dismiss message">×</button>}
    </div>
  );
}

const longTextFields = new Set([
  "explanation", "scenario", "prompt", "script", "expectedAnswer", "goal", "partnerCue", "cueTranslation",
  "modelResponse", "responseTranslation", "writingPrompt", "subtitle", "exampleSentence", "exampleTranslation",
]);

function labelFor(key: string) {
  return fieldLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function singularLabel(key: string) {
  const labels: Record<string, string> = {
    examples: "Example", commonMistakes: "Mistake", practice: "Question", guidedPractice: "Exercise", choices: "Choice",
    questions: "Question", vocabularyIds: "Vocabulary ID", requiredPhrases: "Phrase", grammarMarkers: "Marker",
    checklist: "Checklist item", recap: "Recap point", canDo: "Outcome", phrases: "Phrase", turns: "Turn", writingChecklist: "Checklist item",
  };
  return labels[key] ?? "Item";
}

function searchableText(item: JsonObject) {
  return [item.id, item.level, item.title, item.german, item.english, item.prompt, item.theme, item.setting, item.subtitle].filter(Boolean).join(" ");
}

function itemTitle(item: JsonObject) {
  return String(item.title ?? item.german ?? item.prompt ?? item.id ?? "Untitled item");
}

function itemSubtitle(item: JsonObject) {
  const parts = [item.theme, item.scenario, item.explanation, item.english, item.subtitle, item.setting, item.unitId]
    .filter((part) => typeof part === "string" && part.trim())
    .map(String);
  return parts[0] ?? String(item.id ?? "");
}

function uniqueId(fileName: SupportedContentFile, items: JsonObject[]) {
  const prefix: Record<SupportedContentFile, string> = {
    grammar: "grammar", vocab_a1: "a1-v", vocab_a2: "a2-v", vocab_b1: "b1-v", lessons: "lesson",
    quizzes: "quiz", practical_missions: "mission", everyday_phrases: "phrases",
  };
  const used = new Set(items.map((item) => String(item.id)));
  let counter = items.length + 1;
  let candidate = `${prefix[fileName]}-${String(counter).padStart(3, "0")}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${prefix[fileName]}-${String(counter).padStart(3, "0")}`;
  }
  return candidate;
}

function uniqueNestedPhraseId(items: JsonObject[]) {
  const used = new Set(items.flatMap((item) => Array.isArray(item.phrases) ? item.phrases.map((phrase) => String((phrase as JsonObject).id ?? "")) : []));
  let counter = used.size + 1;
  let candidate = `phrase-${String(counter).padStart(3, "0")}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `phrase-${String(counter).padStart(3, "0")}`;
  }
  return candidate;
}

function nextOrder(items: JsonObject[]) {
  return Math.max(0, ...items.map((item) => Number(item.order) || 0)) + 1;
}

function templateAtPath(root: JsonObject, path: string[]): JsonValue | undefined {
  let current: JsonValue = root;
  for (const segment of path) {
    if (/^\d+$/.test(segment)) continue;
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as JsonObject)[segment];
    if (Array.isArray(current) && segment !== path[path.length - 1]) current = current[0];
  }
  return current;
}

function blankShape(value: JsonValue, key: string): JsonValue {
  if (Array.isArray(value)) return value.length ? [blankShape(value[0], key)] : [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, childKey === "id" ? `item-${Date.now()}` : blankShape(child, childKey)]));
  }
  if (typeof value === "number") return 1;
  if (typeof value === "boolean") return false;
  if (selectOptions[key]) return selectOptions[key][0];
  return "";
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
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
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMetricDay(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function formatDateOnly(value: number | null) {
  if (!value) return "not set";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(value));
}
