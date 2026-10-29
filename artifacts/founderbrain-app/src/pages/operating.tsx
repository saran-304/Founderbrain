import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Clock3, Lightbulb, Plus, Sparkles, Target, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Textarea } from '@workspace/founderbrain-design-system/components/ui/textarea';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/founderbrain-design-system/components/ui/select';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import {
  getListAssistantRunsQueryKey, getGetFundraisingStageQueryKey, getListInvestorsQueryKey,
  getListInvestorNotesQueryKey, getListInvestorFollowUpsQueryKey, getListWorkspacesQueryKey,
  useListAssistantRuns, useCreateAssistantRun, useDeleteAssistantRun,
  useGetFundraisingStage, useUpdateFundraisingStage, useListInvestors,
  useCreateInvestor, useUpdateInvestor, useDeleteInvestor, useListInvestorNotes,
  useCreateInvestorNote, useListInvestorFollowUps, useCreateInvestorFollowUp,
  useUpdateInvestorNote, useDeleteInvestorNote, useUpdateInvestorFollowUp, useDeleteInvestorFollowUp,
  useListWorkspaces,
} from '@workspace/api-client-react';
import type { AssistantRun, AssistantKind, Investor, InvestorPipelineStage, FundraisingStageStage } from '@workspace/api-client-react';
import { BackLink, EmptyState, LoadingBlock, PageHeading, QueryError, useWorkspaceSelection } from '@/components/workspace';

const invalidate = (client: ReturnType<typeof useQueryClient>, key: readonly unknown[]) => void client.invalidateQueries({ queryKey: key });
const stageNames: Record<InvestorPipelineStage, string> = { researching: 'Researching', contacted: 'Contacted', meeting: 'Meeting', due_diligence: 'Due diligence', committed: 'Committed', passed: 'Passed' };
const fundStages: { value: FundraisingStageStage; label: string; detail: string }[] = [
  { value: 'idea', label: 'Idea', detail: 'Exploring the opportunity' },
  { value: 'bootstrapped', label: 'Bootstrapped', detail: 'Growing with customer revenue' },
  { value: 'pre_seed', label: 'Pre-seed', detail: 'Finding early conviction' },
  { value: 'seed', label: 'Seed', detail: 'Building the first repeatable engine' },
  { value: 'series_a', label: 'Series A', detail: 'Scaling what is working' },
  { value: 'series_b_plus', label: 'Series B+', detail: 'Expanding with focus' },
  { value: 'other', label: 'Other', detail: 'A different path' },
];

const assistantOptions: { kind: AssistantKind; name: string; description: string; icon: typeof Lightbulb; placeholder: string }[] = [
  { kind: 'idea_validation', name: 'Idea validation', description: 'Pressure-test the customer problem and your assumptions.', icon: Lightbulb, placeholder: 'Describe the customer, the problem, and what you believe is true…' },
  { kind: 'business_plan', name: 'Business plan', description: 'Organize the opportunity, model, and first milestones.', icon: Target, placeholder: 'Share the customer, product, market, business model, and current stage…' },
  { kind: 'product_roadmap', name: 'Product roadmap', description: 'Translate a product ambition into a focused sequence.', icon: TrendingUp, placeholder: 'Describe the product, user, current traction, and near-term goals…' },
  { kind: 'pitch_prep', name: 'Pitch preparation', description: 'Practice the case for your company with clear-eyed questions.', icon: Sparkles, placeholder: 'Describe your company, traction, funding goal, and the audience…' },
];

export function AssistantsPage() {
  const client = useQueryClient();
  const { workspaceId } = useWorkspaceSelection();
  const params = useMemo(() => ({ workspaceId }), [workspaceId]);
  const runs = useListAssistantRuns(params, { query: { enabled: !!workspaceId, queryKey: getListAssistantRunsQueryKey(params) } });
  const create = useCreateAssistantRun();
  const remove = useDeleteAssistantRun();
  const [kind, setKind] = useState<AssistantKind>('idea_validation');
  const [prompt, setPrompt] = useState('');
  const [selectedRun, setSelectedRun] = useState<AssistantRun | null>(null);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const refresh = () => invalidate(client, getListAssistantRunsQueryKey(params));
  const selected = assistantOptions.find((option) => option.kind === kind) ?? assistantOptions[0];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim().length < 20 || !workspaceId) return;
    setProviderUnavailable(false);
    create.mutate({ data: { workspaceId, kind, prompt: prompt.trim() } }, {
      onSuccess: (run) => { setPrompt(''); setSelectedRun(run); refresh(); },
      onError: (error) => {
        setProviderUnavailable(true);
        const errorMessage = error?.data?.error || error?.message || 'Your prompt was not saved as a generated answer.';
        toast({ title: 'Assistant request failed', description: errorMessage, variant: 'destructive' });
      },
    });
  };
  if (!workspaceId) return <EmptyState title="Choose a workspace to use assistants" description="Assistant runs are saved with your workspace so your team can return to the thinking later." />;
  if (runs.isLoading) return <LoadingBlock title="Loading saved assistant runs" />;
  if (runs.isError) return <QueryError onRetry={() => void runs.refetch()} />;
  return <div>
    <PageHeading eyebrow="Founder tools" title="A thinking partner for the hard parts" description="Use structured prompts to make your next decision clearer. Runs are saved only when the provider returns a real result." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-5">
        <Card><CardHeader><CardTitle className="text-base">Start with a useful question</CardTitle><CardDescription>Be specific about what you know, what is uncertain, and what decision you need to make.</CardDescription></CardHeader><CardContent>
          <div className="grid gap-2 sm:grid-cols-2">{assistantOptions.map(({ kind: optionKind, name, description, icon: Icon }) => <button key={optionKind} type="button" onClick={() => { setKind(optionKind); setProviderUnavailable(false); }} aria-pressed={kind === optionKind} className={`rounded-lg border p-3 text-left transition-colors ${kind === optionKind ? 'border-primary bg-secondary/50' : 'hover:bg-muted/50'}`}><span className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />{name}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></button>)}</div>
          <form className="mt-5 space-y-3" onSubmit={submit}><label className="block space-y-2 text-sm font-medium">{selected.name}<Textarea rows={6} minLength={20} maxLength={8000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={selected.placeholder} aria-label={`${selected.name} prompt`} required /></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">At least 20 characters · {prompt.length}/8000</span><Button type="submit" disabled={create.isPending || prompt.trim().length < 20}><Sparkles className="h-4 w-4" />{create.isPending ? 'Thinking…' : 'Generate guidance'}</Button></div></form>
          {providerUnavailable && <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4" role="status"><p className="text-sm font-semibold">No AI provider is connected yet</p><p className="mt-1 text-sm text-muted-foreground">Your request reached the service, but no provider is configured to generate an answer. No placeholder output has been created.</p></div>}
        </CardContent></Card>
        {selectedRun && <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="secondary">{assistantOptions.find((option) => option.kind === selectedRun.kind)?.name ?? selectedRun.kind}</Badge><CardTitle className="mt-3 text-base">Your guidance</CardTitle><CardDescription>{new Date(selectedRun.createdAt).toLocaleString()}</CardDescription></div><Button size="sm" variant="ghost" onClick={() => setSelectedRun(null)} aria-label="Close assistant response">Close</Button></div></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{selectedRun.prompt}</p><div className="whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">{selectedRun.output}</div></CardContent></Card>}
      </div>
      <Card><CardHeader><CardTitle className="text-base">Saved runs</CardTitle><CardDescription>Return to a previous line of thinking.</CardDescription></CardHeader><CardContent>{runs.data?.length ? <div className="space-y-2">{runs.data.map((run) => <div className="flex items-start gap-2 rounded-lg border p-3" key={run.id}><button className="min-w-0 flex-1 text-left" onClick={() => { setSelectedRun(run); setKind(run.kind); }}><Badge variant="outline">{assistantOptions.find((option) => option.kind === run.kind)?.name ?? run.kind}</Badge><p className="mt-2 line-clamp-2 text-sm font-medium">{run.prompt}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleDateString()}</p></button><Button size="icon" variant="ghost" aria-label="Delete saved assistant run" onClick={() => { if (window.confirm('Delete this saved run?')) remove.mutate({ runId: run.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete saved run', variant: 'destructive' }) }); }}><Trash2 className="h-4 w-4" /></Button></div>)}</div> : <EmptyState title="Nothing saved yet" description="Generated results will be stored here when an assistant provider is configured." />}</CardContent></Card>
    </div>
  </div>;
}

export function FundraisingPage() {
  const client = useQueryClient();
  const { workspaceId } = useWorkspaceSelection();
  const workspaces = useListWorkspaces();
  const currentWorkspace = workspaces.data?.find((workspace) => workspace.id === workspaceId);
  const canManage = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';
  const stage = useGetFundraisingStage(workspaceId, { query: { enabled: !!workspaceId, queryKey: getGetFundraisingStageQueryKey(workspaceId) } });
  const investors = useListInvestors(workspaceId, { query: { enabled: !!workspaceId && canManage, queryKey: getListInvestorsQueryKey(workspaceId) } });
  const updateStage = useUpdateFundraisingStage();
  const create = useCreateInvestor();
  const update = useUpdateInvestor();
  const remove = useDeleteInvestor();
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pipelineStage, setPipelineStage] = useState<InvestorPipelineStage>('researching');
  const [search, setSearch] = useState('');
  const refresh = () => { invalidate(client, getListInvestorsQueryKey(workspaceId)); invalidate(client, getGetFundraisingStageQueryKey(workspaceId)); };
  const submitInvestor = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ workspaceId, data: { workspaceId, name: name.trim(), organization: organization.trim() || null, websiteUrl: websiteUrl.trim() || null, pipelineStage } }, {
      onSuccess: () => { setName(''); setOrganization(''); setWebsiteUrl(''); setPipelineStage('researching'); refresh(); },
      onError: () => toast({ title: 'Could not add investor', description: 'Please check the record and try again.', variant: 'destructive' }),
    });
  };
  const filtered = (investors.data ?? []).filter((investor) => `${investor.name} ${investor.organization ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  if (workspaces.isLoading) return <LoadingBlock title="Loading fundraising pipeline" />;
  if (workspaces.isError) return <QueryError message="Workspace access could not be loaded." onRetry={() => void workspaces.refetch()} />;
  if (!workspaceId) return <EmptyState title="Choose a workspace to track fundraising" description="Keep stage, investor notes, and follow-up work alongside the rest of your startup." />;
  if (stage.isLoading || (canManage && investors.isLoading)) return <LoadingBlock title="Loading fundraising pipeline" />;
  if (stage.isError || (canManage && investors.isError)) return <QueryError onRetry={() => { void stage.refetch(); if (canManage) void investors.refetch(); }} />;
  if (!canManage) return <div className="max-w-4xl"><PageHeading eyebrow="Capital, on your terms" title="Fundraising pipeline" description="Keep your stage and investor conversations alongside the rest of your startup." /><Card><CardContent className="p-5 text-sm text-muted-foreground">Only workspace owners and admins can view or change fundraising records.</CardContent></Card></div>;
  return <div className="max-w-6xl">
    <PageHeading eyebrow="Capital, on your terms" title="Fundraising pipeline" description="Keep a clear view of your stage and your investor conversations. Records here are entered by you; Founderbrain does not source or contact investors." />
    <Card className="mb-5"><CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr] md:items-center"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Current fundraising stage</p><h2 className="mt-2 text-xl font-semibold">{fundStages.find((item) => item.value === stage.data?.stage)?.label ?? 'Set your stage'}</h2><p className="mt-1 text-sm text-muted-foreground">{fundStages.find((item) => item.value === stage.data?.stage)?.detail}</p></div><div className="flex flex-wrap gap-2">{fundStages.map((item) => <Button key={item.value} size="sm" variant={stage.data?.stage === item.value ? 'default' : 'outline'} disabled={updateStage.isPending} onClick={() => updateStage.mutate({ workspaceId, data: { stage: item.value } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update stage', variant: 'destructive' }) })}>{item.label}</Button>)}</div></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card><CardHeader><CardTitle className="text-base">Add an investor</CardTitle><CardDescription>Capture a lead you have identified. No outreach is sent from this form.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={submitInvestor}>
        <label className="block space-y-2 text-sm font-medium">Investor name<Input required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block space-y-2 text-sm font-medium">Organization<Input value={organization} onChange={(e) => setOrganization(e.target.value)} /></label>
        <label className="block space-y-2 text-sm font-medium">Website<Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" /></label>
        <label className="block space-y-2 text-sm font-medium">Pipeline stage<Select value={pipelineStage} onValueChange={(value) => setPipelineStage(value as InvestorPipelineStage)}><SelectTrigger aria-label="Investor pipeline stage"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(stageNames).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label>
        <Button type="submit" disabled={!name.trim() || create.isPending}><Plus className="h-4 w-4" />Add investor</Button>
      </form></CardContent></Card>
      <section className="space-y-3">
        <div className="flex gap-2"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your investor records" aria-label="Search investor records" /></div>
        {filtered.length ? filtered.map((investor) => <InvestorCard key={investor.id} investor={investor} onRefresh={refresh} updateInvestor={update} deleteInvestor={remove} />) : <EmptyState title={search ? 'No matching investor records' : 'A clear pipeline starts with one record'} description={search ? 'Try another name or organization.' : 'Add an investor you are actively researching or speaking with.'} />}
      </section>
    </div>
  </div>;
}

function InvestorCard({ investor, onRefresh, updateInvestor, deleteInvestor }: {
  investor: Investor; onRefresh: () => void;
  updateInvestor: ReturnType<typeof useUpdateInvestor>; deleteInvestor: ReturnType<typeof useDeleteInvestor>;
}) {
  const client = useQueryClient();
  const notes = useListInvestorNotes(investor.id);
  const followUps = useListInvestorFollowUps(investor.id);
  const createNote = useCreateInvestorNote();
  const updateNote = useUpdateInvestorNote();
  const deleteNote = useDeleteInvestorNote();
  const createFollowUp = useCreateInvestorFollowUp();
  const updateFollowUp = useUpdateInvestorFollowUp();
  const deleteFollowUp = useDeleteInvestorFollowUp();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [followTitle, setFollowTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteText, setEditingNoteText] = useState('');
  const [name, setName] = useState(investor.name);
  const [organization, setOrganization] = useState(investor.organization ?? '');
  const refresh = () => { invalidate(client, getListInvestorNotesQueryKey(investor.id)); invalidate(client, getListInvestorFollowUpsQueryKey(investor.id)); onRefresh(); };
  return <Card><CardContent className="p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
      {editing ? <div className="space-y-2"><Input aria-label="Investor name" value={name} onChange={(e) => setName(e.target.value)} /><Input aria-label="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} /></div> : <><h2 className="font-semibold">{investor.name}</h2><p className="mt-1 text-sm text-muted-foreground">{investor.organization || 'Independent investor'}{investor.websiteUrl && <> · <a className="text-primary underline" href={investor.websiteUrl} target="_blank" rel="noreferrer">Website</a></>}</p></>}
      <div className="mt-3"><Select value={investor.pipelineStage} onValueChange={(value) => updateInvestor.mutate({ investorId: investor.id, data: { pipelineStage: value as InvestorPipelineStage } }, { onSuccess: onRefresh, onError: () => toast({ title: 'Could not update investor stage', variant: 'destructive' }) })}><SelectTrigger className="h-8 w-40" aria-label={`Stage for ${investor.name}`}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(stageNames).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    </div><div className="flex gap-1">{editing ? <><Button size="sm" disabled={!name.trim() || updateInvestor.isPending} onClick={() => updateInvestor.mutate({ investorId: investor.id, data: { name: name.trim(), organization: organization.trim() || null } }, { onSuccess: () => { setEditing(false); onRefresh(); }, onError: () => toast({ title: 'Could not update investor', variant: 'destructive' }) })}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(investor.name); setOrganization(investor.organization ?? ''); }}>Cancel</Button></> : <><Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button><Button size="icon" variant="ghost" aria-label={`Delete ${investor.name}`} disabled={deleteInvestor.isPending} onClick={() => { if (window.confirm(`Delete ${investor.name} and its fundraising notes?`)) deleteInvestor.mutate({ investorId: investor.id }, { onSuccess: onRefresh, onError: () => toast({ title: 'Could not delete investor', variant: 'destructive' }) }); }}><Trash2 className="h-4 w-4" /></Button></>}</div></div>
    <Button size="sm" variant="outline" className="mt-4" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide notes and follow-ups' : 'Open investor record'}<ArrowRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} /></Button>
    {expanded && <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
      <div className="space-y-3"><h3 className="text-sm font-semibold">Conversation notes</h3><form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; createNote.mutate({ investorId: investor.id, data: { content: note.trim() } }, { onSuccess: () => { setNote(''); refresh(); }, onError: () => toast({ title: 'Could not save note', variant: 'destructive' }) }); }}><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note about the conversation…" aria-label={`Note for ${investor.name}`} /><Button size="sm" type="submit" disabled={!note.trim() || createNote.isPending}>Save note</Button></form>
        {notes.isLoading ? <div className="h-12 animate-pulse rounded bg-muted" /> : notes.isError ? <QueryError message="Notes could not be loaded." onRetry={() => void notes.refetch()} /> : notes.data?.length ? <div className="space-y-2">{notes.data.map((item) => <div className="rounded-lg bg-muted/40 p-3" key={item.id}>
          {editingNoteId === item.id ? <Textarea rows={3} value={editingNoteText} onChange={(event) => setEditingNoteText(event.target.value)} aria-label="Edit investor note" /> : <p className="whitespace-pre-wrap text-sm">{item.content}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p><div className="flex gap-1">{editingNoteId === item.id ? <><Button size="sm" variant="ghost" disabled={!editingNoteText.trim() || updateNote.isPending} onClick={() => updateNote.mutate({ noteId: item.id, data: { content: editingNoteText.trim() } }, { onSuccess: () => { setEditingNoteId(''); refresh(); }, onError: () => toast({ title: 'Could not update note', variant: 'destructive' }) })}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingNoteId('')}>Cancel</Button></> : <Button size="sm" variant="ghost" onClick={() => { setEditingNoteId(item.id); setEditingNoteText(item.content); }}>Edit</Button>}<Button size="sm" variant="ghost" aria-label="Delete investor note" disabled={deleteNote.isPending} onClick={() => { if (window.confirm('Delete this investor note?')) deleteNote.mutate({ noteId: item.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete note', variant: 'destructive' }) }); }}>Delete</Button></div></div>
        </div>)}</div> : <p className="text-xs text-muted-foreground">No notes recorded.</p>}</div>
      <div className="space-y-3"><h3 className="text-sm font-semibold">Follow-up tasks</h3><form className="space-y-2" onSubmit={(event) => { event.preventDefault(); if (!followTitle.trim()) return; createFollowUp.mutate({ investorId: investor.id, data: { title: followTitle.trim(), dueDate: dueDate || null } }, { onSuccess: () => { setFollowTitle(''); setDueDate(''); refresh(); }, onError: () => toast({ title: 'Could not create follow-up', variant: 'destructive' }) }); }}><Input value={followTitle} onChange={(e) => setFollowTitle(e.target.value)} placeholder="e.g. Send the updated deck" aria-label={`Follow-up title for ${investor.name}`} /><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Follow-up due date" /><Button size="sm" type="submit" disabled={!followTitle.trim() || createFollowUp.isPending}>Add follow-up</Button></form>
        {followUps.isLoading ? <div className="h-12 animate-pulse rounded bg-muted" /> : followUps.isError ? <QueryError message="Follow-ups could not be loaded." onRetry={() => void followUps.refetch()} /> : followUps.data?.length ? <div className="space-y-2">{followUps.data.map((task) => <div key={task.id} className="flex items-start gap-2 rounded-lg border p-3"><button className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${task.status === 'completed' ? 'bg-primary text-primary-foreground' : ''}`} aria-label={task.status === 'completed' ? 'Reopen follow-up' : 'Complete follow-up'} disabled={updateFollowUp.isPending} onClick={() => updateFollowUp.mutate({ followUpId: task.id, data: { status: task.status === 'completed' ? 'open' : 'completed' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update follow-up', variant: 'destructive' }) })}>{task.status === 'completed' && <Check className="h-3 w-3" />}</button><div className="min-w-0 flex-1"><p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'font-medium'}`}>{task.title}</p>{task.dueDate && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />Due {new Date(task.dueDate).toLocaleDateString()}</p>}</div><Button size="icon" variant="ghost" aria-label="Delete follow-up" disabled={deleteFollowUp.isPending} onClick={() => deleteFollowUp.mutate({ followUpId: task.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete follow-up', variant: 'destructive' }) })}><Trash2 className="h-4 w-4" /></Button></div>)}</div> : <p className="text-xs text-muted-foreground">No follow-up tasks yet.</p>}</div>
    </div>}
  </CardContent></Card>;
}
