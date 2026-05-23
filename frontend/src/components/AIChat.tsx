'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Terminal, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import MapAndCard from './MapAndCard';
import LeaseLedgerCard from './LeaseLedgerCard';
import { useApp } from '@/lib/ThemeProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string[];
  toolCalls?: { name: string; args: any; result?: any }[];
  uiComponent?: { component: string; props: any };
}

export default function AIChat() {
  const { t } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant', content: t('chatWelcome')
  }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');
  const [collapsedThoughts, setCollapsedThoughts] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/').then(r => r.json()).then(d => { if (d.status === 'online') setBackendStatus('online'); }).catch(() => {});
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleThoughts = (id: string) => setCollapsedThoughts(p => ({ ...p, [id]: !p[id] }));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;
    const userText = query;
    setQuery('');
    setIsGenerating(true);
    const uid = `msg-${Date.now()}`;
    const aid = `msg-a-${Date.now()}`;
    setMessages(p => [...p, { id: uid, role: 'user', content: userText }]);
    setMessages(p => [...p, { id: aid, role: 'assistant', content: '', thoughts: [], toolCalls: [] }]);
    const userId = localStorage.getItem('ez_tenant_id') || 'tenant-123';

    if (backendStatus === 'online') {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userText, user_id: userId })
        });
        if (!res.body) throw new Error('no body');
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            buf += dec.decode(value, { stream: !done });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const l of lines) {
              if (l.startsWith('data: ')) {
                try { updateMsg(aid, JSON.parse(l.slice(6))); } catch {}
              }
            }
          }
        }
        setIsGenerating(false);
      } catch { simulateOffline(userText, aid); }
    } else {
      simulateOffline(userText, aid);
    }
  };

  const updateMsg = (id: string, ev: any) => {
    setMessages(p => p.map(m => {
      if (m.id !== id) return m;
      const thoughts = [...(m.thoughts || [])];
      const toolCalls = [...(m.toolCalls || [])];
      let content = m.content;
      let uiComponent = m.uiComponent;
      if (ev.type === 'thinking') thoughts.push(ev.step);
      else if (ev.type === 'tool_call') toolCalls.push({ name: ev.tool_name, args: ev.args });
      else if (ev.type === 'tool_result' && toolCalls.length) toolCalls[toolCalls.length - 1].result = ev.result;
      else if (ev.type === 'text') content += ev.delta;
      else if (ev.type === 'ui_component') uiComponent = { component: ev.component, props: ev.props };
      return { ...m, content, thoughts, toolCalls, uiComponent };
    }));
  };

  const typewriter = async (id: string, text: string) => {
    let cur = '';
    for (const ch of text) {
      cur += ch;
      setMessages(p => p.map(m => m.id === id ? { ...m, content: cur } : m));
      await new Promise(r => setTimeout(r, 14));
    }
  };

  const simulateOffline = async (userText: string, msgId: string) => {
    const lc = userText.toLowerCase();
    const addThought = (s: string) => setMessages(p => p.map(m => m.id === msgId ? { ...m, thoughts: [...(m.thoughts||[]), s] } : m));
    const addTool = (name: string, args: any) => setMessages(p => p.map(m => m.id === msgId ? { ...m, toolCalls: [...(m.toolCalls||[]), { name, args }] } : m));
    const setToolResult = (idx: number, result: any) => setMessages(p => p.map(m => {
      if (m.id !== msgId) return m;
      const tc = [...(m.toolCalls||[])];
      tc[idx] = { ...tc[idx], result };
      return { ...m, toolCalls: tc };
    }));

    addThought('分析用户查询意图…（离线模拟器）');
    await new Promise(r => setTimeout(r, 900));

    const isLedger = lc.includes('rent') || lc.includes('payment') || lc.includes('lease') || lc.includes('账单') || lc.includes('台账') || lc.includes('交租');

    if (isLedger) {
      addThought('查询租约数据库（绕过 RLS）…');
      addTool('check_rental_status', { user_id: 'tenant-123' });
      await new Promise(r => setTimeout(r, 800));
      const mockPayments = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_payments') || '[]') : [];
      const mockLeases = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_leases') || '[]') : [];
      const mockUnits = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_units') || '[]') : [];
      const lease = mockLeases[0] || { id: 'l1-uuid', start_date: '2026-02-01', end_date: '2027-01-31', monthly_rent: 2500, unit_id: 'u1-uuid' };
      const unit = mockUnits.find((u: any) => u.id === lease.unit_id) || { unit_number: 'Block B-12-08', community_id: 'c1-uuid' };
      const communities = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_communities') || '[]') : [];
      const community = communities.find((c: any) => c.id === unit.community_id) || { name: 'Sunway Geo Residences' };
      setToolResult(0, { has_active_lease: true, lease, payments: mockPayments });
      await new Promise(r => setTimeout(r, 600));
      await typewriter(msgId, `已查到您在 **${community.name} ${unit.unit_number}** 的租约台账，请查看下方月度账单。`);
      setMessages(p => p.map(m => m.id === msgId ? { ...m, uiComponent: { component: 'LeaseLedgerCard', props: { community_name: community.name, unit_number: unit.unit_number, start_date: lease.start_date, end_date: lease.end_date, monthly_rent: lease.monthly_rent, payments: mockPayments } } } : m));
    } else {
      addThought('使用 pgvector 余弦相似度在数据库语义检索…');
      addTool('search_internal_db', { semantic_query: userText });
      await new Promise(r => setTimeout(r, 900));
      const units = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_units') || '[]') : [];
      const communities = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ez_communities') || '[]') : [];
      const unit = units[0] || { id: 'u1-uuid', community_id: 'c1-uuid', room_type: 'Studio', rent: 2500, description: '阳光城公寓 Studio，步行可达 Monash 大学。' };
      const community = communities.find((c: any) => c.id === unit.community_id) || { name: 'Sunway Geo Residences', lat: 3.06341, lng: 101.60977 };
      setToolResult(0, [unit]);
      await new Promise(r => setTimeout(r, 700));
      addThought('计算通勤路线…');
      addTool('calculate_commute', { origin: community.name, university: 'Monash University' });
      await new Promise(r => setTimeout(r, 700));
      setToolResult(1, { distance: '1.2 km', walking: '10 mins', driving: '4 mins' });
      await new Promise(r => setTimeout(r, 500));
      await typewriter(msgId, `为您推荐 **${community.name}** 的 **${unit.room_type}**\n\n- **月租**：RM ${unit.rent}\n- **步行到校**：约 10 分钟\n- **开车到校**：约 4 分钟\n- **简介**：${unit.description}`);
      setMessages(p => p.map(m => m.id === msgId ? { ...m, uiComponent: { component: 'MapAndCard', props: { origin_name: community.name, origin_lat: community.lat, origin_lng: community.lng, destination_name: 'Monash University', destination_lat: 3.0645, destination_lng: 101.6000, rent: unit.rent, room_type: unit.room_type, unit_id: unit.id } } } : m));
    }
    setIsGenerating(false);
  };

  const prompts = [t('prompt1'), t('prompt2'), t('prompt3')];

  return (
    <div className="chat-layout">
      {/* Chat pane */}
      <div className="chat-panel">
        <div className="chat-messages">
          {messages.map(m => {
            const hasThoughts = m.thoughts && m.thoughts.length > 0;
            const open = !collapsedThoughts[m.id];
            return (
              <div key={m.id} className="chat-bubble-container">
                <div className="bubble-meta" style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <Bot size={13} style={{ color: 'var(--primary)' }} />}
                  <span>{m.role === 'user' ? t('chatYou') : t('chatAgentName')}</span>
                </div>
                <div className={`chat-bubble ${m.role}`}>
                  {m.role === 'assistant' && hasThoughts && (
                    <div className="thought-log-container">
                      <div onClick={() => toggleThoughts(m.id)} className="thought-header">
                        <Terminal size={13} />
                        <span>{t('chatThoughtTrace')}</span>
                        {open ? <ChevronUp size={13} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
                      </div>
                      {open && (
                        <div className="thought-list">
                          {m.thoughts?.map((th, i) => <div key={i} className="thought-item">› {th}</div>)}
                          {m.toolCalls?.map((tc, i) => (
                            <div key={i} className="tool-run">
                              <div>
                                <span className={`tool-badge ${tc.name.includes('db') || tc.name.includes('search') ? 'db' : tc.name.includes('commute') ? 'commute' : tc.name.includes('web') ? 'web' : 'ledger'}`}>{tc.name}</span>
                                <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>({Object.keys(tc.args).map(k => `${k}: ${tc.args[k]}`).join(', ')})</span>
                              </div>
                              {tc.result && <div style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: 4, marginTop: 4, maxHeight: 80, overflowY: 'auto', fontSize: '0.75rem' }}>→ {JSON.stringify(tc.result).slice(0, 200)}…</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  {m.role === 'assistant' && m.uiComponent && (
                    <div>
                      {m.uiComponent.component === 'MapAndCard' && <MapAndCard {...m.uiComponent.props} />}
                      {m.uiComponent.component === 'LeaseLedgerCard' && (
                        <LeaseLedgerCard {...m.uiComponent.props} onPaymentUpdated={() => simulateOffline('查看账单', m.id)} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isGenerating && (
            <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 12px', alignItems: 'center' }}>
              <Loader className="animate-spin" size={15} />
              <span>{t('chatThinking')}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-wrapper">
          <Sparkles size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('chatPlaceholder')} className="chat-input" disabled={isGenerating} />
          <button type="submit" className="send-button" disabled={isGenerating}><Send size={16} /></button>
        </form>
      </div>

      {/* Side panel */}
      <div className="side-context-panel">
        <div className="glass-card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} style={{ color: 'var(--primary)' }} /> {t('agentStatus')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 14 }}>{t('agentDesc')}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '8px 12px', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{ color: backendStatus === 'online' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
              {backendStatus === 'online' ? t('agentConnected') : t('agentOffline')}
            </span>
          </div>
        </div>

        <div className="glass-card">
          <h4 style={{ fontSize: '0.88rem', marginBottom: 12 }}>{t('quickPromptsTitle')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prompts.map((p, i) => (
              <div key={i} className="prompt-pill" onClick={() => setQuery(p)}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
