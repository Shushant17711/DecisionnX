"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { BriefChecklist } from "@/components/BriefChecklist";
import { Chamber } from "@/components/Chamber";
import { FileDrop } from "@/components/FileDrop";
import { HistorySidebar, HistoryToggle } from "@/components/HistorySidebar";
import { Icon } from "@/components/Icon";
import { PanelSizeControl } from "@/components/PanelSizeControl";
import {
  buildChecklist,
  composeContext,
  getDraft,
  getDraftServerSnapshot,
  replaceDraft,
  sampleSourceFile,
  SAMPLE_BRIEF,
  snapshot,
  subscribeDraft,
  summarise,
  updateDraft,
  type BriefField,
} from "@/lib/brief";
import { isEditableTarget } from "@/lib/dom";
import { startEvaluation } from "@/lib/evaluation";
import { FEATURED_SAMPLE_ID, seedSamples } from "@/lib/samples";
import { BASE_PATH } from "@/lib/base";

const IS_HOSTED_DEMO = BASE_PATH !== "";

/** Two finished evaluations from the bundled history: one the panel passed, one it stopped. */
const VERDICT_EXAMPLES = [
  {
    id: "ev_sample_discharge",
    verdict: "Go",
    tone: "verdict-go",
    color: "var(--patina)",
    score: "7.0",
    agreement: "84%",
    title: "Discharge follow-up calls for district hospitals",
    gist: "Cheap, evidence-backed, wanted by the ward and the district. The panel only argued about what counts as proof.",
  },
  {
    id: "ev_sample_screening",
    verdict: "No-Go",
    tone: "verdict-nogo",
    color: "var(--vermilion)",
    score: "3.0",
    agreement: "74%",
    title: "Identity-blind résumé screening for small HR teams",
    gist: "Two legal seats and the investor all landed against it, for different reasons. Automated ranking is high-risk territory.",
  },
] as const;

const EXAMPLE_IDEAS = [
  "A tiffin subscription for college students in Pune — home-style meals, monthly plans, routed by a demand model instead of fixed menus",
  "A carbon credit marketplace where small Indian manufacturers can sell verified offsets without a broker",
  "A community library app that matches rural readers with urban book donors and handles the logistics",
  "Résumé screening for HR teams under twenty people, built to strip identity signals before ranking",
  "A skill exchange where people trade expertise by the hour instead of paying each other",
];

export default function HomePage() {
  const router = useRouter();
  const draft = useSyncExternalStore(subscribeDraft, getDraft, getDraftServerSnapshot);
  const [files, setFiles] = useState<File[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const [sampleState, setSampleState] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const criteriaRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const constraintsRef = useRef<HTMLTextAreaElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never steal ⌘/Ctrl+K from the brief's text fields.
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHistoryOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const summary = useMemo(
    () => summarise(buildChecklist(draft, files.length)),
    [draft, files.length],
  );

  const focusField = (field: BriefField) => {
    const target =
      field === "idea"
        ? ideaRef.current
        : field === "criteria"
          ? criteriaRef.current
          : field === "context"
            ? contextRef.current
            : field === "constraints"
              ? constraintsRef.current
              : // FileDrop's own trigger — the checklist row should land on the
                // control that satisfies it, not merely near it.
                sourcesRef.current?.querySelector<HTMLButtonElement>("button");
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  };

  const submit = () => {
    const idea = draft.idea.trim();
    if (!idea) return;
    startEvaluation({
      idea,
      context: composeContext(draft),
      panelSize: draft.panelSize,
      files,
      brief: snapshot(draft, summary, files.map((f) => f.name)),
    });
    router.push("/results");
  };

  const loadWorkedExample = async () => {
    setSampleState("loading");
    replaceDraft({ ...SAMPLE_BRIEF, sourceNames: ["unit-economics.csv"], updatedAt: Date.now() });
    setFiles([sampleSourceFile()]);
    const outcome = await seedSamples();
    setSampleState(outcome.ok ? "ready" : "failed");
  };

  const [openingExample, setOpeningExample] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const openExample = async (id: string) => {
    setOpeningExample(id);
    setExampleError(null);
    const outcome = await seedSamples();
    if (outcome.ok) {
      router.push(`/results?id=${id}`);
    } else {
      setExampleError(outcome.reason);
      setOpeningExample(null);
    }
  };

  return (
    <div className="relative z-[1] min-h-dvh">
      <HistorySidebar open={historyOpen} onClose={closeHistory} />

      <nav className="mx-auto flex max-w-[76rem] items-center justify-between px-6 py-5 md:px-10">
        <span className="wordmark">DecisionnX</span>
        <HistoryToggle onClick={openHistory} />
      </nav>

      <main className="mx-auto max-w-[76rem] px-6 md:px-10">
        {/* Examples first: two finished verdicts, one each way, a click away. */}
        <section
          aria-labelledby="examples-heading"
          className="examples-band mt-2 rounded-[14px] p-4 md:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h2 id="examples-heading" className="flex items-center gap-2.5 text-[1.0625rem]">
              <span className="examples-tag">Examples</span>
              <span>See the table decide, both ways</span>
            </h2>
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              Real finished evaluations from the history. Opens the full verdict.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {VERDICT_EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => openExample(ex.id)}
                disabled={openingExample !== null}
                className="example-card group flex items-start gap-4 rounded-[10px] p-4 text-left"
                style={{ "--seam-color": ex.color } as React.CSSProperties}
              >
                <span className="flex w-[4.25rem] shrink-0 flex-col items-center">
                  <span className="display tnum text-[2.25rem] leading-none" style={{ color: ex.color }}>
                    {ex.score}
                  </span>
                  <span className="mt-1 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    / 10
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`verdict ${ex.tone}`}>{ex.verdict}</span>
                    <span className="tnum text-[0.75rem] text-[var(--text-muted)]">
                      {ex.agreement} agreement · 7 experts
                    </span>
                  </span>
                  <span className="mt-2 block text-[0.9375rem] font-medium leading-snug text-[var(--foreground)]">
                    {ex.title}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--text-secondary)]">
                    {ex.gist}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--accent)]">
                    {openingExample === ex.id ? "Opening…" : "Open this verdict"}
                    <Icon name="arrowRight" size={14} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          {exampleError && (
            <p role="alert" className="mt-3 px-1 text-[0.8125rem] text-[var(--vermilion-text)]">
              {exampleError}
            </p>
          )}
        </section>

        {/* Hero — offset rather than centered, so the page reads left-to-right
            into the form instead of stacking symmetric blocks. */}
        <section className="grid items-start gap-x-16 gap-y-12 pb-8 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="lg:sticky lg:top-10">
            <p className="label">The chamber is open</p>
            <h1 className="mt-5 text-[clamp(2.75rem,5.4vw,4.5rem)]">
              Put your idea
              <br className="hidden sm:block" />{" "}
              <span className="display-italic text-[var(--accent)]">before the table.</span>
            </h1>
            <p className="measure mt-8 text-[1.0625rem] leading-relaxed text-[var(--text-secondary)]">
              Describe anything — a business, a system design, a policy, a research direction. A
              panel of experts takes a seat around it, each one argues their own corner, and the
              minutes come back with a scored verdict and the exact points where the room split.
            </p>

            <Chamber
              className="mt-10 max-w-[34rem]"
              seats={Array.from({ length: draft.panelSize }, (_, i) => ({
                key: String(i),
                stance: "waiting" as const,
              }))}
              centre={
                <>
                  <span className="display tnum text-[2.75rem] leading-none text-[var(--foreground)]">
                    {draft.panelSize}
                  </span>
                  <span className="mt-1 text-[0.75rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {draft.panelSize === 1 ? "seat" : "seats"} at the table
                  </span>
                </>
              }
              caption="Change the panel size in the brief and the table resets."
            />

            {/* The worked example: a complete brief and three finished evaluations,
                so the filters and the report have something real to act on. */}
            <div className="mt-10 border-t border-[var(--border-subtle)] pt-6">
              <p className="label">First time here</p>
              <p className="measure mt-2.5 text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
                Load a worked example: every section of the brief filled in, with three finished
                evaluations added to your history to read and export.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={loadWorkedExample}
                  disabled={sampleState === "loading"}
                  className="btn-quiet flex items-center gap-2 px-3.5 py-2 text-[0.8125rem]"
                >
                  <Icon name="spark" size={15} />
                  {sampleState === "loading" ? "Loading…" : "Load a worked example"}
                </button>
                {sampleState === "ready" && (
                  <button
                    type="button"
                    onClick={() => router.push(`/report?id=${FEATURED_SAMPLE_ID}`)}
                    className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--accent)]"
                  >
                    Open the sample report
                    <Icon name="arrowRight" size={14} />
                  </button>
                )}
                {sampleState === "failed" && (
                  <span className="text-[0.8125rem] text-[var(--text-muted)]">
                    The brief is filled in, but the sample records could not be read.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="panel-raised seam p-6 md:p-7">
            <label htmlFor="idea" className="label">
              The idea
            </label>
            <textarea
              id="idea"
              ref={ideaRef}
              value={draft.idea}
              onChange={(e) => updateDraft({ idea: e.target.value })}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              placeholder="A tiffin subscription for college students that routes meals by demand rather than a fixed menu…"
              rows={5}
              className="field mt-2.5 resize-y"
            />

            <label htmlFor="criteria" className="label mt-5 block">
              Success criteria
            </label>
            <textarea
              id="criteria"
              ref={criteriaRef}
              value={draft.criteria}
              onChange={(e) => updateDraft({ criteria: e.target.value })}
              placeholder="The bar this has to clear — margin, adoption, timeline, risk you can accept…"
              rows={2}
              className="field mt-2.5 resize-y text-[0.875rem]"
            />

            <label htmlFor="context" className="label mt-5 block">
              Decision context
            </label>
            <textarea
              id="context"
              ref={contextRef}
              value={draft.context}
              onChange={(e) => updateDraft({ context: e.target.value })}
              placeholder="Stage, budget, timeline, what you have already tried…"
              rows={3}
              className="field mt-2.5 resize-y text-[0.875rem]"
            />

            <label htmlFor="constraints" className="label mt-5 block">
              Constraints <span className="normal-case tracking-normal">— optional</span>
            </label>
            <textarea
              id="constraints"
              ref={constraintsRef}
              value={draft.constraints}
              onChange={(e) => updateDraft({ constraints: e.target.value })}
              placeholder="What cannot change: regulation, headcount, a ceiling you will not cross…"
              rows={2}
              className="field mt-2.5 resize-y text-[0.875rem]"
            />

            <div className="mt-5" ref={sourcesRef}>
              <FileDrop files={files} onChange={setFiles} />
            </div>

            <hr className="my-6 border-0 border-t border-[var(--border-subtle)]" />

            <PanelSizeControl value={draft.panelSize} onChange={(n) => updateDraft({ panelSize: n })} />

            <hr className="my-6 border-0 border-t border-[var(--border-subtle)]" />

            <BriefChecklist summary={summary} onFocusField={focusField} />

            <button
              type="button"
              onClick={submit}
              disabled={!draft.idea.trim()}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem]"
            >
              Seat the panel
              <Icon name="arrowRight" size={17} />
            </button>

            {summary.missingRequired.length > 0 ? (
              <p className="mt-2.5 flex items-start justify-center gap-1.5 text-center text-[0.75rem] leading-relaxed text-[var(--text-muted)]">
                <Icon name="alert" size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <span>
                  {summary.missingRequired.join(" and ")} still open — the panel will run on a
                  thinner brief.
                </span>
              </p>
            ) : (
              <p className="mt-2.5 text-center text-[0.75rem] text-[var(--text-muted)]">
                Results stream in as each expert finishes
              </p>
            )}
            {IS_HOSTED_DEMO && (
              <p className="mt-2 text-center text-[0.75rem] leading-relaxed text-[var(--text-muted)]">
                Hosted demo: live panels need the backend running locally on port 8001.
                The examples above work without it.
              </p>
            )}
          </div>
        </section>

        {/* Examples */}
        <section className="border-t border-[var(--border-subtle)] py-10">
          <p className="label">Start from one of these</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_IDEAS.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => updateDraft({ idea: example })}
                  className="panel panel-interactive h-full w-full px-4 py-3 text-left text-[0.8125rem] leading-relaxed text-[var(--text-secondary)]"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works — the actual mechanism, not three feature cards */}
        <section className="border-t border-[var(--border-subtle)] py-16">
          <h2 className="max-w-[20ch]">What happens after you press the button</h2>
          <div className="mt-10">
            <ArchitectureDiagram />
          </div>
        </section>

        <footer className="border-t border-[var(--border-subtle)] py-8">
          <p className="measure text-[0.75rem] leading-relaxed text-[var(--text-muted)]">
            DecisionnX produces AI-generated analysis for thinking through an idea. It is not
            financial, legal, medical, or professional advice. Evaluations are stored in this
            browser only.
          </p>
        </footer>
      </main>
    </div>
  );
}
