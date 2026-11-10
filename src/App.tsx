import { useEffect, useRef, useState } from 'react';
import { request, RequestError } from './api';
import { quantity, date } from './format';
import { planNames } from './types';
import { Icon } from './Icon';
import { Disclosure } from './Disclosure';
import { revealEdit } from './motion';
import type { ActivityItem, ActivityPage, Allowance, Config, Customer, Rewrite } from './types';

type Load<T> = { state: 'empty' | 'loading' | 'ready' | 'failed'; data?: T; error?: string };
const errorText = (error: unknown) => error instanceof RequestError ? `${error.message} [${error.detail.code}, HTTP ${error.detail.status || 'unavailable'}]` : 'The response could not be read. Refresh to try again.';
const sampleDraft = 'We wanted to reach out to let you know that we have been working on some improvements to the onboarding process. We would really appreciate it if you could take a look and share any thoughts you might have.';
const wordCount = (value: string) => value.trim() ? value.trim().split(/\s+/).length : 0;
function Mark() { return <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>; }
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} aria-hidden="true">{name.split(' ').map(part => part[0]).join('')}</span>;
}

export function App() {
  const [config, setConfig] = useState<Config>();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [section, setSection] = useState('writing');
  async function loadConfig() {
    setError('');
    try { setConfig(await request<Config>('config')); }
    catch (e) { setError(errorText(e)); }
  }
  useEffect(() => { void loadConfig(); }, []);
  async function signIn(account: Customer['account']) {
    setSigningIn(true); setError('');
    try {
      const result = await request<{ customer: Customer }>('session', { account });
      setConfig(value => value ? { ...value, customer: result.customer } : value);
      setSection('writing');
    } catch (e) { setError(errorText(e)); }
    finally { setSigningIn(false); }
  }
  async function signOut() {
    setSigningIn(true); setError('');
    try {
      await request('logout', {});
      setConfig(value => value ? { ...value, customer: null } : value);
    } catch (e) { setError(errorText(e)); }
    finally { setSigningIn(false); }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <aside className="sidebar" aria-label="Workspace navigation">
      <a className="brand" href="/" aria-label="Write room home"><Mark /><span>Write room</span></a>
      <nav className="workspace-nav" aria-label="Main navigation">
        <a href="#writing" className={section === 'writing' ? 'nav-link active' : 'nav-link'} aria-current={section === 'writing' ? 'location' : undefined} onClick={() => setSection('writing')}><Icon name="pen" />Writing desk<span className="nav-dot" /></a>
        {config?.customer && <a href="#activity" className={section === 'activity' ? 'nav-link active' : 'nav-link'} aria-current={section === 'activity' ? 'location' : undefined} onClick={() => setSection('activity')}><Icon name="activity" />Activity</a>}
      </nav>
      <div className="account-block"><span className="section-label">Demo account</span>
        {config?.demoSignIn ? <><div className="account-select"><Avatar name={config.customer?.name ?? 'Demo account'} small /><label className="sr-only" htmlFor="account">Demo account</label><select id="account" value={config.customer?.account ?? ''} onChange={e => void signIn(e.target.value as Customer['account'])} disabled={signingIn}>
          <option value="" disabled>Choose an account</option><option value="a">Alex Morgan</option><option value="b">Sam Rivera</option><option value="c">Jordan Lee</option>
        </select><Icon name="chevron" size={13} /></div><Disclosure label="Demo details" className="demo-details"><p>Each account has its own allowance and Activity. Switching accounts clears the editor.</p></Disclosure></> : <p>{config ? 'Demo sign-in is disabled. Connect production authentication to use this app.' : 'Loading accounts…'}</p>}
      </div>
      {config?.customer && <Plan key={config.customer.account} ready={config.ready} customer={config.customer} />}
      <div className="sidebar-footer"><a href="https://docs.zorveus.com/startups/product-user-activity" target="_blank" rel="noreferrer">Powered by <strong>Zorveus</strong></a></div>
    </aside>
    <main id="main-content">
      <header className="topbar"><div className="breadcrumb"><strong>Writing desk</strong></div><div className="topbar-right">{config?.ready && <span className="connection is-connected"><i />Configured</span>}{config?.customer && <div className="topbar-account"><Avatar name={config.customer.name} small /><button className="icon-button sign-out" aria-label="Sign out" title="Sign out" disabled={signingIn} onClick={() => void signOut()}><Icon name="logout" size={17} /></button></div>}</div></header>
      {error && <div role="alert" className="notice error app-error"><Icon name="info" /><div><p>{error}</p>{!config && <button className="text-button" onClick={() => void loadConfig()}>Try connecting again</button>}</div></div>}
      {config && !config.ready && <section className="setup notice" aria-label="Server setup"><Icon name="info" size={19} /><div><strong>{config.base ? 'Base learning snapshot' : 'Connect Zorveus to enable rewrites'}</strong><Disclosure label="Set up" className="setup-disclosure"><p>Review and apply <code>zorveus.json</code>, add your credentials to <code>.env</code>, then run <code>npm run dev</code>. See the README for configuration details.</p><ul>{config.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></Disclosure></div></section>}
      {config?.customer ? <Workspace key={config.customer.account} customer={config.customer} ready={config.ready} /> : <section className="welcome" id="writing"><div className="welcome-copy"><h1>Your words.<br />A little clearer.</h1><p>Turn a rough draft into a clearer message.</p>{config?.demoSignIn ? <><button className="primary welcome-start" onClick={() => void signIn('a')} disabled={signingIn}>{signingIn ? 'Opening your desk…' : 'Open your writing desk'}<Icon name="arrow" size={17} /></button><span className="welcome-account">Continue as Alex Morgan, demo customer A</span><button className="text-button welcome-alternate" disabled={signingIn} onClick={() => void signIn('b')}>Or try Sam Rivera's account</button></> : <p className="welcome-account">{config ? 'Connect production authentication to open the desk.' : 'Preparing your workspace…'}</p>}</div>
        <div className="welcome-preview" aria-label="Illustrative editing example"><div className="preview-page preview-original"><span className="preview-page-label">The first draft</span><p>We wanted to <s>reach out to</s> let you know <s>that</s> your order is <s>in the process of being</s> shipped.</p><span className="preview-margin" aria-hidden="true" /></div><div className="preview-page preview-edited"><span className="preview-page-label"><Icon name="pen" size={14} />A little clearer</span><p>Your order<br />is on its way.</p><div className="preview-annotation"><span aria-hidden="true">⌁</span>Just what you meant.</div></div><p className="preview-caption">An illustrative edit. Your own rewrites appear after generation.</p></div>
      </section>}
      <footer className="main-footer"><span>Write room</span></footer>
    </main>
  </div>;
}

// Account changes remount both this listener and the editor, keeping usage state isolated.
const refreshedEvent = 'write-room-allowance-refresh';
function Plan({ ready, customer }: { ready: boolean; customer: Customer }) {
  const [allowance, setAllowance] = useState<Load<Allowance>>({ state: 'empty' });
  useEffect(() => {
    const listener = (event: Event) => setAllowance((event as CustomEvent<Load<Allowance>>).detail);
    window.addEventListener(refreshedEvent, listener);
    return () => window.removeEventListener(refreshedEvent, listener);
  }, [customer.account]);
  const data = allowance.data;
  return <section className="plan" aria-label="Current plan">
    <div className="plan-title"><span>Current plan: <strong>{planNames[customer.plan]}</strong></span><span className="plan-emblem" aria-hidden="true"><Icon name="spark" size={16} /></span></div>
    <div className="balance-heading"><span>Credits left</span>{allowance.state === 'loading' && <Icon name="refresh" size={12} className="spinning" />}</div>
    <div className={`credit-number ${data?.remaining == null ? 'balance-unavailable' : ''}`} title={data?.remaining ?? undefined}><span className="balance-value" key={data?.remaining ?? allowance.state}>{data ? quantity(data.remaining, 2) : allowance.state === 'loading' ? 'Loading…' : 'Unavailable'}</span></div>
    {allowance.state === 'failed' && <span className="credit-caption">Refresh failed. Last known balance.</span>}
    <Disclosure label="Allowance details" className="policy-details">
      {data && <dl><div><dt>AI allowance</dt><dd>{quantity(data.capAmount)} {data.currency ?? ''}</dd></div><div><dt>Period</dt><dd>{data.period ?? 'Unavailable'}</dd></div><div><dt>Period ends</dt><dd>{date(data.periodEnd)}</dd></div><div><dt>Enforcement</dt><dd>{data.creditMode ?? 'Unavailable'}</dd></div><div><dt>Overrun policy</dt><dd>{data.overrunPolicy ?? 'Unavailable'}</dd></div></dl>}
      <p>{ready ? 'The live balance includes your selected base allowance and applicable credit grants.' : 'Connect Zorveus to see your live allowance.'}</p>
      <p>Your organization funds AI usage. This starter does not collect subscription payments.</p>
    </Disclosure>
    
  </section>;
}

function Workspace({ customer, ready }: { customer: Customer; ready: boolean }) {
  const [text, setText] = useState('');
  const [clearedDraft, setClearedDraft] = useState('');
  const [output, setOutput] = useState<Rewrite>();
  const [sourceText, setSourceText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [copyState, setCopyState] = useState('Copy text');
  const [editorMessage, setEditorMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [activity, setActivity] = useState<Load<ActivityPage>>({ state: 'empty' });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [latestId, setLatestId] = useState<string>();
  const [confirmation, setConfirmation] = useState<'waiting' | 'unconfirmed' | 'recorded'>('waiting');
  const allowance = useRef<Load<Allowance>>({ state: 'empty' });
  const alive = useRef(true);
  const refreshLock = useRef(false);
  const generationLock = useRef(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(copyTimer.current); }; }, []);
  useEffect(() => {
    if (!focused) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocused(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [focused]);
  function publish(value: Load<Allowance>) {
    allowance.current = value;
    window.dispatchEvent(new CustomEvent(refreshedEvent, { detail: value }));
  }
  async function refresh() {
    if (!ready || refreshLock.current) return;
    refreshLock.current = true; setRefreshing(true);
    publish({ ...allowance.current, state: 'loading' });
    setActivity(value => ({ ...value, state: 'loading', error: undefined }));
    // Deliberate first-read creation precedes the lookup-only Activity request.
    try {
      const data = await request<Allowance>('allowance');
      if (!alive.current) return;
      publish({ state: 'ready', data });
    } catch (e) { if (alive.current) publish({ ...allowance.current, state: 'failed', error: errorText(e) }); }
    try {
      const data = await request<ActivityPage>('activity');
      if (alive.current) setActivity({ state: 'ready', data });
    } catch (e) { if (alive.current) setActivity(value => ({ ...value, state: 'failed', error: errorText(e) })); }
    finally { refreshLock.current = false; if (alive.current) setRefreshing(false); }
  }
  useEffect(() => { void refresh(); }, [ready]);
  useEffect(() => {
    if (latestId && activity.data?.items.some(item => item.activityId === latestId)) setConfirmation('recorded');
  }, [activity.data, latestId]);
  useEffect(() => {
    if (!latestId || confirmation === 'recorded') return;
    const first = window.setTimeout(() => void refresh(), 1500);
    const last = window.setTimeout(() => { void refresh(); setConfirmation(value => value === 'recorded' ? value : 'unconfirmed'); }, 5000);
    return () => { clearTimeout(first); clearTimeout(last); };
  }, [latestId, confirmation === 'recorded']);
  async function rewrite() {
    if (!ready || !text.trim() || generationLock.current) return;
    generationLock.current = true;
    setGenerating(true); setGenerationError(''); setCopyState('Copy text'); setEditorMessage('');
    const submitted = text;
    try {
      const result = await request<Rewrite>('rewrite', { text: submitted });
      if (!alive.current) return;
      setOutput(result); setSourceText(submitted); setLatestId(result.activityId); setConfirmation('waiting'); setEditorMessage('Your rewrite is ready.');
    } catch (e) {
      if (!alive.current) return;
      setGenerationError(errorText(e));
      if (e instanceof RequestError && e.activityId) { setLatestId(e.activityId); setConfirmation('waiting'); }
    } finally {
      generationLock.current = false;
      if (alive.current) { setGenerating(false); void refresh(); }
    }
  }
  async function loadMore() {
    if (!activity.data?.nextCursor || loadingMore || refreshing) return;
    setLoadingMore(true);
    const cursor = activity.data.nextCursor;
    try {
      const page = await request<ActivityPage>(`activity?cursor=${encodeURIComponent(cursor)}`);
      if (alive.current) setActivity(value => ({ state: 'ready', data: { ...page, items: [...(value.data?.items ?? []), ...page.items].filter((item, index, all) => all.findIndex(v => v.id === item.id) === index) } }));
    } catch (e) { if (alive.current) setActivity(value => ({ ...value, state: 'failed', error: errorText(e) })); }
    finally { if (alive.current) setLoadingMore(false); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(output?.text ?? '');
      if (!alive.current) return;
      setCopyState('Copied'); clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => { if (alive.current) setCopyState('Copy text'); }, 2500);
    } catch { if (alive.current) setCopyState('Select the text to copy'); }
  }
  function insertSample(value: string) {
    setText(value); setClearedDraft(''); setEditorMessage('Sample added. You can edit it before rewriting.'); draftRef.current?.focus(); revealEdit(draftRef.current);
  }
  function clearDraft() {
    setClearedDraft(text); setText(''); setEditorMessage('Draft cleared. Select Restore draft to bring it back.'); draftRef.current?.focus(); revealEdit(draftRef.current);
  }
  function useAsDraft() {
    if (!output) return;
    setClearedDraft(text); setText(output.text); setEditorMessage('Rewrite moved to your draft.'); draftRef.current?.focus(); revealEdit(draftRef.current);
  }
  const words = wordCount(text);
  const outputWords = wordCount(output?.text ?? '');
  const canRewrite = ready && Boolean(text.trim()) && !generating;
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  return <div className={`workspace ${focused ? 'is-focused' : ''}`} id="writing">
    <section className="workspace-heading"><div><h1>A clearer draft. Same voice.</h1></div><button aria-label={focused ? 'Exit focus' : 'Focus mode'} className={`focus-button ${focused ? 'is-active' : ''}`} aria-pressed={focused} onClick={() => setFocused(value => !value)}><Icon name={focused ? 'collapse' : 'focus'} size={16} />{focused ? 'Exit focus' : 'Focus mode'}{focused && <kbd>Esc</kbd>}</button></section>
    <section className={`editor ${generating ? 'is-generating' : ''}`} aria-label="Rewrite workspace" aria-busy={generating}>
      <div className="drafts"><div className="draft-input"><div className="draft-label"><label htmlFor="draft">Your draft</label>{text ? <button className="text-button" aria-label="Clear draft" onClick={clearDraft} disabled={generating}><Icon name="close" size={13} />Clear</button> : clearedDraft ? <button className="text-button" onClick={() => { setText(clearedDraft); setClearedDraft(''); draftRef.current?.focus(); revealEdit(draftRef.current); }}><Icon name="undo" size={13} />Restore draft</button> : null}</div>
        <textarea ref={draftRef} id="draft" placeholder="Paste or write your draft…" value={text} onChange={e => { setText(e.target.value); setEditorMessage(''); }} maxLength={6000} spellCheck aria-describedby="draft-help" onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); if (canRewrite) void rewrite(); } }} />
        <div className={`sample-prompts ${text || clearedDraft ? 'is-collapsed' : ''}`} aria-hidden={Boolean(text || clearedDraft)} inert={Boolean(text || clearedDraft)}><div className="sample-content"><div className="sample-options"><button onClick={() => insertSample(sampleDraft)} disabled={generating}>Try a sample<Icon name="arrow" size={14} /></button></div></div></div>
        <div className="draft-meta"><span>{words} {words === 1 ? 'word' : 'words'}</span>{text.length > 5500 && <span className="near-limit">{(6000 - text.length).toLocaleString()} characters left</span>}</div>
      </div><div className="draft-output"><div className="draft-label"><h2>Your rewrite</h2>{output ? <button className={`text-button copy-button ${copyState === 'Copied' ? 'is-copied' : ''}`} onClick={() => void copy()}><Icon name={copyState === 'Copied' ? 'check' : 'copy'} size={14} /><span className="action-label" key={copyState}>{copyState}</span></button> : null}</div>
        {output ? <div className="output-content" key={output.completionId}><p className="output-text">{output.text}</p>{output.finishReason === 'length' && <p className="inline-note">Output reached its token limit and may be incomplete.</p>}{generating && <p className="previous-output-note">Previous rewrite. Your new version is on its way.</p>}</div> : generating ? <div className="generating-state" role="status"><div className="writing-loader"><span /><span /><span /></div><p>Finding the right words…</p></div> : <div className="output-empty"><div className="manuscript-mark" aria-hidden="true"><span>Aa</span><i /><i /><i /><span className="manuscript-edit"><Icon name="pen" size={17} /></span></div><p>Your rewrite will appear here.</p></div>}
        {output && <div className="output-meta"><span>{outputWords} {outputWords === 1 ? 'word' : 'words'}{text !== sourceText && <span className="changed-draft">Draft changed</span>}</span><button className="use-draft" onClick={useAsDraft} disabled={generating}><Icon name="undo" size={13} />Use as draft</button></div>}
      </div></div>
      <div className="editor-actions"><div className="editor-help" id="draft-help"><span className="sr-only">Rewrites use your {planNames[customer.plan]} AI allowance.</span><span className="keyboard-hint"><kbd>{mac ? '⌘' : 'Ctrl'}</kbd><kbd>Enter</kbd></span></div><button className="primary rewrite-button" onClick={() => void rewrite()} disabled={!canRewrite}>{generating ? <><Icon name="refresh" size={16} className="spinning" />Rewriting…</> : <>Rewrite text<Icon name="arrow" size={17} /></>}</button></div>
      <span role="status" aria-live="polite" className="sr-only">{editorMessage}</span>
      {generationError && <div className="notice error generation-error" role="alert"><Icon name="info" size={18} /><p>{generationError}</p></div>}
    </section>
    <div className="usage-panels" inert={focused} aria-hidden={focused}><div className="usage-panels-inner">
    {latestId && <div className={`confirmation ${confirmation}`} role="status"><span className="confirmation-icon"><Icon name={confirmation === 'recorded' ? 'check' : 'activity'} size={16} /></span><div><strong>{confirmation === 'recorded' ? 'Matching Activity found' : confirmation === 'waiting' ? 'Checking Activity for this request…' : 'Latest usage is pending confirmation'}</strong><details><summary>Details</summary><p>{confirmation === 'recorded' ? 'Activity reports the recorded amount and status.' : 'No matching entry is confirmed yet. This does not mean the request was free. Refresh usage to check again.'}</p><code>{latestId}</code>{output?.activityId === latestId && <code>Completion: {output.completionId}</code>}</details></div></div>}
    <section className="activity" aria-label="Customer Activity" id="activity"><div className="activity-heading"><div><h2><Icon name="activity" size={19} />Activity{activity.data && activity.data.items.length > 0 && <span className="activity-count">{activity.data.items.length}{activity.data.hasMore ? '+' : ''}</span>}</h2></div><button className="secondary" disabled={!ready || refreshing || loadingMore} onClick={() => void refresh()}><Icon name="refresh" size={14} className={refreshing ? 'spinning' : ''} />{refreshing ? 'Refreshing…' : 'Refresh usage'}</button></div>
      {allowance.current.state === 'failed' && <div className="notice error" role="alert"><Icon name="info" size={17} /><p>Allowance unavailable. {allowance.current.error}</p></div>}
      {activity.error && <div className="notice error" role="alert"><Icon name="info" size={17} /><p>Activity unavailable. {activity.error}</p></div>}
      {activity.data?.items.length ? <><div className="table-scroll"><table><thead><tr><th>Activity</th><th>Credits charged</th><th>Recorded amount</th><th>Status</th></tr></thead><tbody>{activity.data.items.map(item => <ActivityRow key={item.id} item={item} />)}</tbody></table></div>{activity.data.hasMore && <button className="secondary load-more" disabled={loadingMore || refreshing || !activity.data.nextCursor} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Load earlier activity'}<Icon name="chevron" size={13} /></button>}</> : activity.error ? null : <div className="activity-empty"><span className="activity-empty-icon"><Icon name="activity" size={22} /></span><div><h3>{!ready ? 'Activity unavailable' : activity.state === 'loading' ? 'Loading Activity…' : activity.state === 'failed' ? 'Activity unavailable' : 'No activity yet'}</h3></div></div>}
      {activity.state === 'failed' && activity.data && <p className="inline-note">Showing the last loaded entries. They may be out of date.</p>}
    </section>
    </div></div>
  </div>;
}
function ActivityRow({ item }: { item: ActivityItem }) {
  return <tr><td><span className="activity-row-icon"><Icon name={item.type === 'usage' ? 'pen' : 'activity'} size={16} /></span><div className="activity-item-description"><strong>{item.label}</strong><small>{date(item.createdAt)}{item.model ? ` · ${item.model}` : ''}</small>{item.activityId && <details><summary>Reference</summary><code>{item.activityId}</code></details>}</div></td><td className="numeric" title={item.chargedUnits ?? undefined}>{quantity(item.chargedUnits)}</td><td className="numeric" title={item.amount}>{quantity(item.amount)} <span className="currency">{item.currency}</span></td><td><span className={`status ${['completed', 'settled'].includes(item.status) ? 'is-complete' : ''}`}><i />{item.status}</span></td></tr>;
}
