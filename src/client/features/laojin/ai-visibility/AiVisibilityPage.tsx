// 老金定制：AI 可见度主页面（GEO-ROADMAP.md P0）
"use client";
import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Radar, Plus, Trash2, PlusCircle, X } from "lucide-react";
import {
  listQuerySets,
  listQueries,
  getMetrics,
  listTrials,
  recordTrial,
  createQuerySet,
  deleteQuerySet,
} from "@/serverFunctions/laojin-ai-visibility";
import { toast } from "sonner";
import { t, useT } from "@/client/features/laojin/i18n";

function pct(r: { rate: number; lower: number; upper: number } | null | undefined) {
  if (!r) return "—";
  return `${(r.rate * 100).toFixed(0)}%`;
}
function interval(r: { rate: number; lower: number; upper: number } | null | undefined) {
  if (!r) return "";
  return `[${(r.lower * 100).toFixed(0)}%, ${(r.upper * 100).toFixed(0)}%]`;
}
function delta(d: number | null | undefined) {
  if (d === null || d === undefined) return "";
  const s = d >= 0 ? "+" : "";
  return `${s}${d.toFixed(1)}pp`;
}

function StatCard({
  label,
  value,
  intervalText,
  deltaText,
  sub,
}: {
  label: string;
  value: string;
  intervalText: string;
  deltaText: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="text-xs text-base-content/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-base-content/50">{intervalText}</div>
      <div className="mt-1 text-xs">
        <span className={deltaText.startsWith("+") ? "text-success" : deltaText.startsWith("-") ? "text-error" : "text-base-content/50"}>
          {deltaText || "—"}
        </span>
        <span className="ml-1 text-base-content/40">{sub}</span>
      </div>
    </div>
  );
}

export function AiVisibilityPage({ projectId }: { projectId: string }) {
  useT();
  const qc = useQueryClient();
  const [selectedSet, setSelectedSet] = React.useState<string | null>(null);
  const [showRecord, setShowRecord] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);

  const setsQuery = useQuery({
    queryKey: ["laojin-ai-visibility-sets", projectId],
    queryFn: () => listQuerySets({ data: { projectId } }),
  });
  const sets = setsQuery.data ?? [];
  const activeSet = selectedSet ?? sets[0]?.id ?? null;

  const queriesQuery = useQuery({
    queryKey: ["laojin-ai-visibility-queries", projectId, activeSet],
    queryFn: () =>
      activeSet
        ? listQueries({ data: { projectId, setId: activeSet } })
        : Promise.resolve({ set: null, queries: [] }),
    enabled: Boolean(activeSet),
  });

  const metricsQuery = useQuery({
    queryKey: ["laojin-ai-visibility-metrics", projectId, activeSet],
    queryFn: () =>
      activeSet
        ? getMetrics({ data: { projectId, setId: activeSet } })
        : Promise.resolve(null),
    enabled: Boolean(activeSet),
  });

  const trialsQuery = useQuery({
    queryKey: ["laojin-ai-visibility-trials", projectId, activeSet],
    queryFn: () =>
      activeSet
        ? listTrials({ data: { projectId, setId: activeSet, limit: 100 } })
        : Promise.resolve({ trials: [] }),
    enabled: Boolean(activeSet),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["laojin-ai-visibility"] });
  };

  const deleteMut = useMutation({
    mutationFn: (setId: string) => deleteQuerySet({ data: { projectId, setId } }),
    onSuccess: () => {
      toast.success("Query set deleted");
      setSelectedSet(null);
      invalidate();
    },
  });

  const m = metricsQuery.data ?? null;
  const overall = m?.overall ?? null;
  const weeks = m?.weeks ?? [];
  const trials = trialsQuery.data?.trials ?? [];

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Radar className="size-6 text-primary" /> {t("nav.aiVisibility")}
            </h1>
            <p className="text-sm text-base-content/70">
              {t("aiVis.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-4" /> {t("aiVis.newSet")}
            </button>
            {activeSet && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (confirm(t("Delete this query set and all its trials?"))) deleteMut.mutate(activeSet);
                }}
              >
                <Trash2 className="size-4" />
              </button>
            )}
            {activeSet && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowRecord(true)}>
                <PlusCircle className="size-4" /> {t("aiVis.recordTrial")}
              </button>
            )}
          </div>
        </div>

        {sets.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/50">{t("aiVis.querySet")}</span>
            <select
              className="select select-bordered select-sm max-w-xs"
              value={activeSet ?? ""}
              onChange={(e) => setSelectedSet(e.target.value)}
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.engine}
                </option>
              ))}
            </select>
            {queriesQuery.data?.set && (
              <span className="text-xs text-base-content/40">
                {queriesQuery.data.queries.length} {t("aiVis.queries")} · {queriesQuery.data.set.language}/{queriesQuery.data.set.locale}
              </span>
            )}
          </div>
        )}

        {overall ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label={t("aiVis.answerRate")}
                value={pct(overall.answerRate)}
                intervalText={interval(overall.answerRate)}
                deltaText={delta(overall.weekOverWeek.answerDeltaPp)}
                sub={`n=${overall.n}`}
              />
              <StatCard
                label={t("aiVis.mentionRate")}
                value={pct(overall.mentionRate)}
                intervalText={interval(overall.mentionRate)}
                deltaText={delta(overall.weekOverWeek.mentionDeltaPp)}
                sub={t("aiVis.mentionSub")}
              />
              <StatCard
                label={t("aiVis.citeRate")}
                value={pct(overall.citeRate)}
                intervalText={interval(overall.citeRate)}
                deltaText={delta(overall.weekOverWeek.citeDeltaPp)}
                sub={t("aiVis.citeSub")}
              />
              <StatCard
                label={t("aiVis.conditional")}
                value={pct(overall.conditionalRate)}
                intervalText={interval(overall.conditionalRate)}
                deltaText=""
                sub={t("aiVis.conditionalSub")}
              />
            </div>
            {overall.excluded > 0 && (
              <p className="text-xs text-base-content/40">
                {overall.excluded} {t("aiVis.excludedNote")}
              </p>
            )}

            {weeks.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t("aiVis.weekOf")}</th>
                      <th className="text-right">n</th>
                      <th className="text-right">{t("aiVis.answer")}</th>
                      <th className="text-right">{t("aiVis.mention")}</th>
                      <th className="text-right">{t("aiVis.cite")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((w) => (
                      <tr key={w.week}>
                        <td>{w.week}</td>
                        <td className="text-right">{w.n}</td>
                        <td className="text-right">{w.answerRate === null ? "—" : `${(w.answerRate * 100).toFixed(0)}%`}</td>
                        <td className="text-right">{w.mentionRate === null ? "—" : `${(w.mentionRate * 100).toFixed(0)}%`}</td>
                        <td className="text-right">{w.citeRate === null ? "—" : `${(w.citeRate * 100).toFixed(0)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">
            {sets.length === 0
              ? t("aiVis.noSets")
              : t("aiVis.noTrials")}
          </div>
        )}

        {trials.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t("aiVis.collected")}</th>
                  <th>{t("aiVis.query")}</th>
                  <th>{t("aiVis.engine")}</th>
                  <th className="text-center">{t("aiVis.answer")}</th>
                  <th className="text-center">{t("aiVis.mention")}</th>
                  <th className="text-center">{t("aiVis.cite")}</th>
                  <th>{t("aiVis.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-xs">{t.collectedAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="text-xs">{t.queryId}</td>
                    <td className="text-xs">{t.engine}</td>
                    <td className="text-center">{t.eligible === false ? "—" : t.answered ? "✅" : "❌"}</td>
                    <td className="text-center">{t.eligible === false ? "—" : t.brandMentioned ? "✅" : "—"}</td>
                    <td className="text-center">{t.eligible === false ? "—" : t.brandCited ? "✅" : "—"}</td>
                    <td className="text-xs text-base-content/50">
                      {t.eligible === false ? `excluded: ${t.exclusionReason ?? ""}` : t.notes ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRecord && activeSet && (
        <RecordTrialModal
          projectId={projectId}
          setId={activeSet}
          queries={queriesQuery.data?.queries ?? []}
          engine={queriesQuery.data?.set?.engine ?? "chatgpt-ai-search"}
          onClose={() => setShowRecord(false)}
          onSaved={() => {
            setShowRecord(false);
            invalidate();
          }}
        />
      )}
      {showCreate && (
        <CreateSetModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function RecordTrialModal({
  projectId,
  setId,
  queries,
  engine,
  onClose,
  onSaved,
}: {
  projectId: string;
  setId: string;
  queries: { queryId: string; text: string }[];
  engine: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [queryId, setQueryId] = React.useState(queries[0]?.queryId ?? "");
  const [answered, setAnswered] = React.useState<boolean | null>(null);
  const [mentioned, setMentioned] = React.useState<boolean | null>(null);
  const [cited, setCited] = React.useState<boolean | null>(null);
  const [eligible, setEligible] = React.useState(true);
  const [exclusionReason, setExclusionReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [model, setModel] = React.useState("");

  const mut = useMutation({
    mutationFn: () =>
      recordTrial({
        data: {
          projectId,
          setId,
          queryId,
          engine,
          model: model || undefined,
          eligible,
          answered: eligible ? answered : null,
          brandMentioned: eligible ? mentioned : null,
          brandCited: eligible ? cited : null,
          exclusionReason: eligible ? null : exclusionReason || "unspecified",
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Trial recorded");
      onSaved();
    },
  });

  const tri = (label: string, v: boolean | null, set: (b: boolean | null) => void) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`btn btn-xs ${v === true ? "btn-primary" : "btn-ghost"}`}
        onClick={() => set(v === true ? null : true)}
      >
        {v === true ? "✅" : "○"} {t("Yes")}</button>
      <button
        type="button"
        className={`btn btn-xs ${v === false ? "btn-primary" : "btn-ghost"}`}
        onClick={() => set(v === false ? null : false)}
      >
        {v === false ? "✅" : "○"} No
      </button>
      <span className="text-xs text-base-content/50">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("aiVis.recordTitle")}</h2>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-base-content/60">{t("Query")}</label>
            <select className="select select-bordered select-sm w-full" value={queryId} onChange={(e) => setQueryId(e.target.value)}>
              {queries.map((q) => (
                <option key={q.queryId} value={q.queryId}>
                  {q.queryId} — {q.text.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" className="checkbox checkbox-xs" checked={eligible} onChange={(e) => setEligible(e.target.checked)} />
              {t("aiVis.eligible")}
            </label>
            <input
              className="input input-bordered input-sm flex-1"
              placeholder={t("aiVis.modelPlaceholder")}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          {eligible ? (
            <>
              {tri(t("aiVis.answered"), answered, setAnswered)}
              {tri(t("aiVis.brandMentioned"), mentioned, setMentioned)}
              {tri(t("aiVis.brandCited"), cited, setCited)}
            </>
          ) : (
            <input
              className="input input-bordered input-sm w-full"
              placeholder={t("aiVis.exclusionPlaceholder")}
              value={exclusionReason}
              onChange={(e) => setExclusionReason(e.target.value)}
            />
          )}
          <textarea
            className="textarea textarea-bordered textarea-sm w-full"
            placeholder={t("aiVis.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary btn-sm" disabled={mut.isPending || (!eligible && !exclusionReason)} onClick={() => mut.mutate()}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateSetModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [engine, setEngine] = React.useState("chatgpt-ai-search");
  const [lines, setLines] = React.useState("brand-1|What is Laojin Global?\ncat-1|What are agent skills?");

  const mut = useMutation({
    mutationFn: () => {
      const queries = lines
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [qid, ...rest] = l.split("|");
          const text = rest.join("|").trim();
          return { queryId: qid.trim(), text };
        })
        .filter((q) => q.queryId && q.text);
      return createQuerySet({
        data: {
          projectId,
          name,
          engine,
          language: "en",
          locale: "us",
          queries,
        },
      });
    },
    onSuccess: () => {
      toast.success("Query set created");
      onCreated();
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("aiVis.createTitle")}</h2>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <input className="input input-bordered input-sm w-full" placeholder={t("aiVis.setNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input input-bordered input-sm w-full" placeholder={t("aiVis.enginePlaceholder")} value={engine} onChange={(e) => setEngine(e.target.value)} />
          <div>
            <p className="text-xs text-base-content/60">{t("aiVis.queriesHint")}</p>
            <textarea className="textarea textarea-bordered textarea-sm w-full font-mono text-xs" rows={8} value={lines} onChange={(e) => setLines(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary btn-sm" disabled={mut.isPending || !name.trim()} onClick={() => mut.mutate()}>
              {t("common.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
