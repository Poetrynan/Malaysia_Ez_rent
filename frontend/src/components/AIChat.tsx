'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import MapAndCard from './MapAndCard';
import LeaseLedgerCard from './LeaseLedgerCard';
import { useApp } from '@/lib/ThemeProvider';

/* ── Types ── */
interface ToolCard {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'running' | 'done' | 'error';
  result?: any;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  thoughts: string[];
  tools: ToolCard[];
  content: string;
  uiComponents: { component: string; props: any }[];
  contentStarted: boolean;
}

/* ── Helpers ── */
const toolIcon = (name: string) =>
  name.includes('search') || name.includes('knowledge') ? '🔍'
  : name.includes('commute') ? '🚇'
  : name.includes('web') ? '🌐'
  : name.includes('currency') ? '💱'
  : name.includes('holiday') ? '📅'
  : '⚙️';

const renderMarkdown = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} className="md-h4">{line.slice(4)}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} className="md-h3">{line.slice(3)}</h3>;
    if (line.startsWith('# ')) return <h2 key={i} className="md-h2">{line.slice(2)}</h2>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="md-li">{line.slice(2)}</li>;
    if (!line.trim()) return <div key={i} className="md-br" />;
    // inline bold + code
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    return (
      <p key={i} className="md-p">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
          if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="md-code">{part.slice(1, -1)}</code>;
          return part;
        })}
      </p>
    );
  });
};

/* ── Component ── */
export default function AIChat() {
  const { t, lang } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ez_tenant_id') || 'tenant-123';
    return 'tenant-123';
  });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://127.0.0.1:8000';
    fetch(`${apiUrl}/`).then(r => r.json()).then(d => { if (d.status === 'online') setBackendStatus('online'); }).catch(() => {});
    const resolveUser = async () => {
      try {
        const { supabase, isMockDatabase } = await import('@/lib/supabase');
        if (!isMockDatabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) { setUserId(user.id); localStorage.setItem('ez_tenant_id', user.id); }
        }
      } catch {}
    };
    resolveUser();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleTool = (id: string) => setExpandedTools(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /* ── SSE Event Handler ── */
  const updateMsg = (id: string, ev: any) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== id) return m;
      const thoughts = [...m.thoughts];
      const tools = [...m.tools];
      let content = m.content;
      let contentStarted = m.contentStarted;
      const uiComponents = [...m.uiComponents];

      if (ev.type === 'thinking') {
        thoughts.push(ev.step);
      } else if (ev.type === 'tool_call') {
        tools.push({ id: `tc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: ev.tool_name, args: ev.args, status: 'running' });
      } else if (ev.type === 'tool_result') {
        const last = tools[tools.length - 1];
        if (last) { last.status = 'done'; last.result = ev.result; }
      } else if (ev.type === 'text') {
        content += ev.delta;
        contentStarted = true;
      } else if (ev.type === 'ui_component') {
        uiComponents.push({ component: ev.component, props: ev.props });
      }

      return { ...m, thoughts, tools, content, contentStarted, uiComponents };
    }));
  };

  /* ── Send Message ── */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;
    const userText = query;
    setQuery('');
    setIsGenerating(true);

    const uid = `msg-u-${Date.now()}`;
    const aid = `msg-a-${Date.now()}`;
    setMessages(prev => [...prev,
      { id: uid, role: 'user', content: userText, thoughts: [], tools: [], uiComponents: [], contentStarted: false },
      { id: aid, role: 'assistant', content: '', thoughts: [], tools: [], uiComponents: [], contentStarted: false }
    ]);

    const apiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://127.0.0.1:8000';
    try {
      let authToken = '';
      try {
        const { supabase, isMockDatabase } = await import('@/lib/supabase');
        if (!isMockDatabase) { const { data: { session } } = await supabase.auth.getSession(); authToken = session?.access_token || ''; }
      } catch {}
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST', headers,
        body: JSON.stringify({ query: userText, user_id: userId, history: messages.map(m => ({ role: m.role, content: m.content || m.thoughts.join(' ') })) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('no body');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const l of lines) {
            if (l.startsWith('data: ')) {
              try { updateMsg(aid, JSON.parse(l.slice(6))); } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      const detail = err?.message || String(err);
      let errorMsg = '⚠️ AI 助手暂时无法响应，请稍后再试。';
      if (detail.includes('429') || detail.includes('quota')) errorMsg = '🙏 抱歉，AI 助手今日请求已达上限，请稍后再试。';
      else if (detail.includes('503')) errorMsg = '⏳ AI 助手当前繁忙，请稍等几秒后重试。';
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: errorMsg, contentStarted: true } : m));
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="manus-layout">
      <div className="manus-scroll">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="manus-welcome">
            <Bot size={40} style={{ color: 'var(--primary)' }} />
            <h2>{t('chatAgentName')}</h2>
            <p>{t('chatWelcome')}</p>
          </div>
        )}

        {/* Messages */}
        {messages.map(m => (
          <div key={m.id} className={`manus-msg ${m.role}`}>
            {/* User message */}
            {m.role === 'user' && (
              <div className="manus-user-bubble">
                <div className="manus-avatar"><User size={14} /></div>
                <div className="manus-user-text">{m.content}</div>
              </div>
            )}

            {/* Assistant message */}
            {m.role === 'assistant' && (
              <div className="manus-assistant">
                <div className="manus-avatar assistant"><Bot size={14} /></div>
                <div className="manus-assistant-content">
                  {/* Thinking steps */}
                  {m.thoughts.map((th, i) => (
                    <div key={`th-${i}`} className="manus-thought">
                      <span className="manus-thought-dot" />
                      <span>{th}</span>
                    </div>
                  ))}

                  {/* Tool cards */}
                  {m.tools.map(tc => (
                    <div key={tc.id} className={`manus-tool-card ${tc.status}`}>
                      <div className="manus-tool-header" onClick={() => toggleTool(tc.id)}>
                        <span className="manus-tool-icon">{toolIcon(tc.name)}</span>
                        <span className="manus-tool-name">{tc.name}</span>
                        <span className={`manus-tool-status ${tc.status}`}>
                          {tc.status === 'running' && <span className="tool-spinner" />}
                          {tc.status === 'done' && <CheckCircle size={14} />}
                          {tc.status === 'error' && <XCircle size={14} />}
                        </span>
                        <span className="manus-tool-toggle">
                          {expandedTools.has(tc.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      </div>
                      {/* Args */}
                      <div className="manus-tool-args">
                        {Object.entries(tc.args).map(([k, v]) => (
                          <span key={k} className="manus-tool-arg">{k}: <code>{String(v)}</code></span>
                        ))}
                      </div>
                      {/* Expandable raw output */}
                      {expandedTools.has(tc.id) && tc.result && (
                        <div className="manus-tool-output">
                          <pre>{typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : String(tc.result)}</pre>
                        </div>
                      )}
                      {/* Done summary */}
                      {tc.status === 'done' && !expandedTools.has(tc.id) && tc.result && (
                        <div className="manus-tool-summary">
                          {Array.isArray(tc.result) ? `✓ ${tc.result.length} 条结果` : '✓ 完成'}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Thinking indicator (while generating, no content yet) */}
                  {isGenerating && !m.contentStarted && m.tools.length === 0 && m.thoughts.length === 0 && (
                    <div className="manus-thinking-indicator">
                      <span className="manus-thought-dot pulse" />
                      <span>分析中...</span>
                    </div>
                  )}

                  {/* Final answer */}
                  {m.contentStarted && (
                    <div className="manus-answer">
                      <div className="manus-answer-divider" />
                      <div className="manus-answer-label">📝 最终回答</div>
                      <div className="manus-answer-content">
                        {renderMarkdown(m.content)}
                      </div>
                    </div>
                  )}

                  {/* UI Components (map, cards) */}
                  {m.contentStarted && m.uiComponents.length > 0 && (
                    <div className="manus-ui-components">
                      {m.uiComponents.map((item, i) => (
                        <div key={i} className="manus-ui-wrapper">
                          {item.component === 'MapAndCard' && <MapAndCard {...item.props} />}
                          {item.component === 'LeaseLedgerCard' && <LeaseLedgerCard {...item.props} onPaymentUpdated={() => {}} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="manus-input-bar">
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={t('chatPlaceholder')}
          className="manus-input" disabled={isGenerating}
        />
        <button type="submit" className="manus-send" disabled={isGenerating} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
