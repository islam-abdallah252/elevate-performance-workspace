import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KpiKey, KpiKeyInput, KpiTemplate, TemplateInput, TemplateItem, User } from "@kpi/contracts";
import { useActor } from "../context/actor-context";
import { api, json } from "../lib/api";
import { Badge, Button, Empty, ErrorState, Input, Loading, Modal, PageHeader, Select, Switch } from "../components/ui";

export function KpiKeysPage() {
  const { actorId, actor } = useActor();
  const client = useQueryClient();
  const [editing, setEditing] = useState<KpiKey | "new" | null>(null);
  const enabled = actor?.isManager === true;
  const query = useQuery({ queryKey: ["keys", actorId], queryFn: () => api<KpiKey[]>("/kpi-keys"), enabled });
  const users = useQuery({ queryKey: ["users", actorId], queryFn: () => api<User[]>("/users"), enabled });
  const mutation = useMutation({
    mutationFn: ({ originalKey, value }: { originalKey?: string; value: KpiKeyInput }) => api<KpiKey>(originalKey ? `/kpi-keys/${originalKey}` : "/kpi-keys", json(originalKey ? "PUT" : "POST", originalKey ? { name: value.name, description: value.description, dataType: value.dataType, active: value.active } : value)),
    onSuccess: () => { setEditing(null); void client.invalidateQueries(); },
  });
  const deletion = useMutation({ mutationFn: (key: string) => api<KpiKey>(`/kpi-keys/${key}`, { method: "DELETE" }), onSuccess: () => void client.invalidateQueries() });

  if (!actor) return <Loading />;
  if (!actor.isManager) return <><PageHeader title="KPI library" description="KPI library management is available to managers." /><Empty title="Manager access required" text="Your assigned KPI configuration is available from My performance." /></>;
  if (query.isLoading || users.isLoading) return <Loading />;
  if (query.error || users.error) return <ErrorState error={query.error ?? users.error} />;

  const root = actor?.isManager && actor.managerId === null;
  const system = query.data?.filter((key) => key.ownerUserId === null) ?? [];
  const mine = query.data?.filter((key) => key.ownerUserId === actorId) ?? [];
  const fromHierarchy = query.data?.filter((key) => key.ownerUserId !== null && key.ownerUserId !== actorId) ?? [];
  const ownerName = (id: string | null) => id ? users.data?.find((user) => user.id === id)?.name ?? "Manager" : "System";
  const remove = (key: KpiKey) => {
    if (window.confirm(`Delete “${key.name}”? This is only allowed when it is not used by a template or evaluation.`)) deletion.mutate(key.key);
  };
  return <>
    <PageHeader title="KPI library" description="Create manager-owned KPI keys and reuse authorized keys in team templates." action={<Button onClick={() => setEditing("new")}>+ New KPI key</Button>} />
    {(mutation.error || deletion.error) && <div className="mb-5"><ErrorState error={mutation.error ?? deletion.error} /></div>}
    <KeySection title="My KPI Library" description="Custom KPI keys you created and own." keys={mine} ownerName={ownerName} canEdit={() => true} onEdit={setEditing} onDelete={remove} />
    {fromHierarchy.length > 0 && <div className="mt-8"><KeySection title="KPI Keys From My Management Hierarchy" description="Custom keys created by managers below you." keys={fromHierarchy} ownerName={ownerName} canEdit={() => true} onEdit={setEditing} onDelete={remove} /></div>}
    <div className="mt-8"><KeySection title="System KPI Library" description="Starter keys available to every manager. Their key codes remain immutable." keys={system} ownerName={ownerName} canEdit={() => root} onEdit={setEditing} /></div>
    <Modal open={editing !== null} title={editing === "new" ? "Create KPI key" : `Edit ${editing?.key ?? "KPI"}`} onClose={() => setEditing(null)}>{editing && <KpiKeyForm initial={editing === "new" ? { key: "", name: "", description: "", dataType: "score", active: true } : editing} isNew={editing === "new"} busy={mutation.isPending} error={mutation.error} onSave={(value) => mutation.mutate({ originalKey: editing !== "new" ? editing.key : undefined, value })} />}</Modal>
  </>;
}

function KeySection({ title, description, keys, ownerName, canEdit, onEdit, onDelete }: { title: string; description: string; keys: KpiKey[]; ownerName: (id: string | null) => string; canEdit: (key: KpiKey) => boolean; onEdit: (key: KpiKey) => void; onDelete?: (key: KpiKey) => void }) {
  return <section><div className="mb-4"><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-gray-500">{description}</p></div>{keys.length === 0 ? <Empty title="No KPI keys here" text="Create a KPI key to build your team library." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{keys.map((key) => <article className="card p-5" key={key.key}><div className="flex items-center justify-between"><div className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{key.key}</div><Badge tone={key.active ? "green" : "gray"}>{key.active ? "Active" : "Inactive"}</Badge></div><h3 className="mt-4 font-semibold">{key.name}</h3><p className="mt-1 min-h-10 text-sm text-gray-500">{key.description}</p><p className="mt-3 text-xs font-medium text-gray-500">Owned by {ownerName(key.ownerUserId)}</p><div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><Badge>{key.dataType}</Badge>{canEdit(key) && <div className="flex gap-3"><button className="text-sm font-semibold text-brand-700" onClick={() => onEdit(key)}>Edit</button>{onDelete && key.ownerUserId !== null && <button className="text-sm font-semibold text-red-600" onClick={() => onDelete(key)}>Delete</button>}</div>}</div></article>)}</div>}</section>;
}

function KpiKeyForm({ initial, isNew, busy, error, onSave }: { initial: KpiKeyInput; isNew: boolean; busy: boolean; error: Error | null; onSave: (value: KpiKeyInput) => void }) {
  const [form, setForm] = useState<KpiKeyInput>(initial);
  useEffect(() => setForm(initial), [initial]);
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, key: form.key.trim().toUpperCase() }); }}>{error && <ErrorState error={error} />}<label><span className="label">Key code</span><Input required disabled={!isNew} placeholder="CUSTOM_KPI" value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toUpperCase().replace(/\s+/g, "_") })} /><span className="mt-1 block text-xs text-gray-500">The code is globally unique and cannot be renamed after creation.</span></label><label><span className="label">Name</span><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span className="label">Description</span><textarea required className="field min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label><span className="label">Data type</span><Select value={form.dataType} onChange={(event) => setForm({ ...form, dataType: event.target.value as KpiKeyInput["dataType"] })}><option value="score">Score / rating</option><option value="percentage">Percentage</option><option value="number">Number</option></Select></label><div className="rounded-lg border border-gray-200 p-4"><Switch label="Active key" checked={form.active} onChange={(active) => setForm({ ...form, active })} /></div><div className="flex justify-end"><Button disabled={busy}>{busy ? "Saving…" : isNew ? "Create KPI key" : "Save KPI key"}</Button></div></form>;
}

const newTemplate = (): TemplateInput => ({ name: "", description: "", status: "draft", items: [] });

const defaultExpectedValue = (key: KpiKey) => {
  const systemDefaults: Record<string, number> = { Q1: 3, Q2: 3, Q3: 4, Q4: 5, Q5: 8, Q6: 3, Q7: 10, Q8: 10, Q9: 5, Q10: 45 };
  return systemDefaults[key.key] ?? (key.dataType === "percentage" ? 100 : key.dataType === "number" ? 1 : 3);
};

const selectedTemplate = (template: TemplateInput): TemplateInput => ({
  ...template,
  items: template.items.filter((item) => item.enabled).map((item) => ({ ...item, enabled: true })),
});

export function TemplatesPage() {
  const { actorId, actor } = useActor();
  const client = useQueryClient();
  const [editing, setEditing] = useState<KpiTemplate | "new" | null>(null);
  const enabled = actor?.isManager === true;
  const templates = useQuery({ queryKey: ["templates", actorId], queryFn: () => api<KpiTemplate[]>("/kpi-templates"), enabled });
  const keys = useQuery({ queryKey: ["keys", actorId], queryFn: () => api<KpiKey[]>("/kpi-keys"), enabled });
  const users = useQuery({ queryKey: ["users", actorId], queryFn: () => api<User[]>("/users"), enabled });
  const mutation = useMutation({
    mutationFn: ({ id, value }: { id?: string; value: TemplateInput }) => api<KpiTemplate>(id ? `/kpi-templates/${id}` : "/kpi-templates", json(id ? "PUT" : "POST", value)),
    onSuccess: () => { setEditing(null); void client.invalidateQueries(); },
  });
  const deletion = useMutation({ mutationFn: (id: string) => api<KpiTemplate>(`/kpi-templates/${id}`, { method: "DELETE" }), onSuccess: () => void client.invalidateQueries() });

  if (!actor) return <Loading />;
  if (!actor.isManager) return <><PageHeader title="KPI templates" description="Template management is available to managers." /><Empty title="Manager access required" text="Your assigned KPI configuration is available from My performance." /></>;
  if (templates.isLoading || keys.isLoading || users.isLoading) return <Loading />;
  if (templates.error || keys.error || users.error) return <ErrorState error={templates.error ?? keys.error ?? users.error} />;

  const mine = templates.data?.filter((template) => template.ownerUserId === actorId) ?? [];
  const fromHierarchy = templates.data?.filter((template) => template.ownerUserId !== actorId) ?? [];
  const ownerName = (id: string) => users.data?.find((user) => user.id === id)?.name ?? "Manager";
  const remove = (template: KpiTemplate) => {
    if (window.confirm(`Delete “${template.name}”? This is only allowed when the template has no assignments or evaluations.`)) deletion.mutate(template.id);
  };

  return <>
    <PageHeader title="KPI templates" description="Templates are scoped to you and the managers in your reporting hierarchy." action={<Button onClick={() => setEditing("new")}>+ New template</Button>} />
    {(mutation.error || deletion.error) && <div className="mb-5"><ErrorState error={mutation.error ?? deletion.error} /></div>}
    <TemplateSection title="My Templates" description="Templates you created and own." templates={mine} ownerName={ownerName} onEdit={setEditing} onDelete={remove} />
    {fromHierarchy.length > 0 && <div className="mt-8"><TemplateSection title="Templates From My Management Hierarchy" description="Templates created by managers below you." templates={fromHierarchy} ownerName={ownerName} onEdit={setEditing} onDelete={remove} /></div>}
    <Modal open={editing !== null} title={editing === "new" ? "Create KPI template" : "Edit KPI template"} onClose={() => setEditing(null)}>
      <TemplateForm initial={editing === "new" ? newTemplate() : editing ?? newTemplate()} keys={keys.data ?? []} busy={mutation.isPending} error={mutation.error} onSave={(value) => mutation.mutate({ id: editing !== "new" && editing ? editing.id : undefined, value })} />
    </Modal>
  </>;
}

function TemplateSection({ title, description, templates, ownerName, onEdit, onDelete }: {
  title: string; description: string; templates: KpiTemplate[]; ownerName: (id: string) => string;
  onEdit: (template: KpiTemplate) => void; onDelete: (template: KpiTemplate) => void;
}) {
  return <section><div className="mb-4"><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-gray-500">{description}</p></div>
    {templates.length === 0 ? <Empty title="No templates here" text="Create a template to configure KPI expectations for your team." /> : <div className="grid gap-4 lg:grid-cols-2">{templates.map((template) => <TemplateCard key={template.id} template={template} owner={ownerName(template.ownerUserId)} onEdit={() => onEdit(template)} onDelete={() => onDelete(template)} />)}</div>}
  </section>;
}

function TemplateCard({ template, owner, onEdit, onDelete }: { template: KpiTemplate; owner: string; onEdit: () => void; onDelete: () => void }) {
  const enabledItems = template.items.filter((item) => item.enabled);
  const total = enabledItems.reduce((sum, item) => sum + item.weight, 0);
  return <article className="card p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-1 text-sm text-gray-500">{template.description}</p><p className="mt-2 text-xs font-medium text-gray-500">Owned by {owner}</p></div><Badge tone={template.status === "active" ? "green" : template.status === "draft" ? "amber" : "gray"}>{template.status}</Badge></div>
    <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 text-sm"><div><div className="text-gray-500">Enabled KPIs</div><strong>{enabledItems.length}</strong></div><div><div className="text-gray-500">Total weight</div><strong>{total}%</strong></div><div><div className="text-gray-500">Readiness</div><strong className={total === 100 ? "text-green-700" : "text-amber-700"}>{template.status === "active" ? "Assignable" : "Draft"}</strong></div></div>
    <div className="mt-5 flex gap-4"><button className="text-sm font-semibold text-brand-700" onClick={onEdit}>Edit template →</button><button className="text-sm font-semibold text-red-600" onClick={onDelete}>Delete</button></div>
  </article>;
}

export function TemplateForm({ initial, keys, busy, error, onSave }: { initial: TemplateInput; keys: KpiKey[]; busy: boolean; error: Error | null; onSave: (value: TemplateInput) => void }) {
  const [form, setForm] = useState(() => selectedTemplate(initial));
  useEffect(() => setForm(selectedTemplate(initial)), [initial]);
  const updateItem = (key: string, change: Partial<TemplateItem>) => setForm((old) => ({ ...old, items: old.items.map((item) => item.key === key ? { ...item, ...change } : item) }));
  const addItem = (keyCode: string) => {
    const key = keys.find((entry) => entry.key === keyCode);
    if (!key || !key.active || form.items.some((item) => item.key === keyCode)) return;
    setForm((old) => ({ ...old, items: [...old.items, { key: key.key, expectedValue: defaultExpectedValue(key), weight: 10, enabled: true }] }));
  };
  const removeItem = (key: string) => setForm((old) => ({ ...old, items: old.items.filter((item) => item.key !== key) }));
  const availableKeys = keys.filter((key) => key.active && !form.items.some((item) => item.key === key.key));
  const total = form.items.reduce((sum, item) => sum + item.weight, 0);
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    {error && <ErrorState error={error} />}
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Template name</span><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span className="label">Status</span><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TemplateInput["status"] })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></Select></label></div>
    <label><span className="label">Description</span><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label><span className="label">Add KPI</span><Select aria-label="Add KPI" value="" disabled={availableKeys.length === 0} onChange={(event) => addItem(event.target.value)}><option value="">{availableKeys.length === 0 ? "All available KPIs are selected" : "Select a KPI to add"}</option>{availableKeys.map((key) => <option key={key.key} value={key.key}>{key.key} — {key.name}</option>)}</Select><span className="mt-1 block text-xs text-gray-500">Choose from the KPI library available to your management hierarchy.</span></label>
    <div className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">Enabled weight total</span><Badge tone={total === 100 ? "green" : "amber"}>{total.toFixed(2)} / 100%</Badge></div>
    {form.items.length === 0 ? <Empty title="No KPIs selected" text="Select a KPI above to add it to this template." /> : <div className="max-h-[42vh] overflow-auto rounded-lg border border-gray-200"><table className="w-full"><thead><tr><th className="table-head">KPI</th><th className="table-head">Expected</th><th className="table-head">Weight</th><th className="table-head"><span className="sr-only">Actions</span></th></tr></thead><tbody>{form.items.map((item) => { const key = keys.find((entry) => entry.key === item.key); return <tr key={item.key}><td className="table-cell"><strong>{item.key}</strong><div className="text-xs text-gray-500">{key?.name ?? "Unavailable KPI"}</div></td><td className="table-cell"><Input aria-label={`${item.key} expected value`} className="w-24" type="number" step="0.01" min="0.01" value={item.expectedValue} onChange={(event) => updateItem(item.key, { expectedValue: Number(event.target.value) })} /></td><td className="table-cell"><Input aria-label={`${item.key} weight`} className="w-24" type="number" step="0.01" min="0" value={item.weight} onChange={(event) => updateItem(item.key, { weight: Number(event.target.value) })} /></td><td className="table-cell text-right"><button type="button" className="text-sm font-semibold text-red-600" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.key}`}>Remove</button></td></tr>; })}</tbody></table></div>}
    <div className="flex justify-end"><Button disabled={busy || form.items.length === 0 || (form.status === "active" && total !== 100)}>{busy ? "Saving…" : "Save template"}</Button></div>
  </form>;
}
