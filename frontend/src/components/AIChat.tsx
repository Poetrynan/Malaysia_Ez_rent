'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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
  const { t, lang } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant', content: t('chatWelcome')
  }]);

  useEffect(() => {
    setMessages(prev => prev.map(m => m.id === 'welcome' ? { ...m, content: t('chatWelcome') } : m));
  }, [lang, t]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');
  const [collapsedThoughts, setCollapsedThoughts] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ez_tenant_id') || 'tenant-123';
    }
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
          if (user) {
            setUserId(user.id);
            localStorage.setItem('ez_tenant_id', user.id);
          }
        } else {
          const stored = localStorage.getItem('ez_tenant_id');
          if (stored) setUserId(stored);
        }
      } catch (e) {
        console.error('Error resolving user in AIChat:', e);
      }
    };
    resolveUser();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleThoughts = (id: string) => setCollapsedThoughts(p => ({ ...p, [id]: !p[id] }));

  // Helper to parse simple markdown to JSX elements
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // 1. Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-h)' }}>
            {renderInlineMarkdown(line.slice(4))}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} style={{ fontSize: '1.05rem', fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--text-h)' }}>
            {renderInlineMarkdown(line.slice(3))}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={index} style={{ fontSize: '1.15rem', fontWeight: 700, margin: '16px 0 8px 0', color: 'var(--text-h)' }}>
            {renderInlineMarkdown(line.slice(2))}
          </h2>
        );
      }

      // 2. Unordered lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={index} style={{ marginLeft: '16px', listStyleType: 'disc', margin: '4px 0', color: 'var(--text-body)' }}>
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
      }

      // 3. Regular lines
      return (
        <p key={index} style={{ margin: '2px 0', minHeight: '1em', color: 'var(--text-body)', wordBreak: 'break-word' }}>
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    // Regex matches bold (**bold**) and inline code (`code`)
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700, color: 'var(--text-h)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              padding: '2px 5px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              border: '1px solid var(--glass-border)'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

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
    const activeUserId = userId || localStorage.getItem('ez_tenant_id') || 'tenant-123';
    const apiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://127.0.0.1:8000';

    try {
      // Get auth token from Supabase session
      let authToken = '';
      try {
        const { supabase, isMockDatabase } = await import('@/lib/supabase');
        if (!isMockDatabase) {
          const { data: { session } } = await supabase.auth.getSession();
          authToken = session?.access_token || '';
        }
      } catch {}
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: userText,
          user_id: activeUserId,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
    } catch (err: any) {
      console.error('AIChat send message failed:', err);
      const detail = err?.message || String(err);
      const isNetwork = detail.includes('Failed to fetch') || detail.includes('NetworkError') || detail.includes('ERR_NETWORK');
      const is401 = detail.includes('401');
      const is503 = detail.includes('503') || detail.includes('UNAVAILABLE') || detail.includes('high demand');
      let errorMsg: string;
      if (is401) {
        errorMsg = lang === 'zh'
          ? '⚠️ 认证失败，请重新登录后再试。'
          : '⚠️ Authentication failed. Please log in and try again.';
      } else if (is503) {
        errorMsg = lang === 'zh'
          ? '⚠️ AI 服务繁忙，请稍后再试。'
          : '⚠️ AI service is busy. Please try again later.';
      } else if (isNetwork) {
        errorMsg = lang === 'zh'
          ? '⚠️ 无法连接到 AI 后端服务，请检查网络或稍后再试。'
          : '⚠️ Cannot reach AI backend. Please check your network or try again later.';
      } else {
        errorMsg = lang === 'zh'
          ? '⚠️ AI 助手暂时无法响应，请稍后再试。'
          : '⚠️ AI assistant is temporarily unavailable. Please try again later.';
      }
      setMessages(p => p.map(m => m.id === aid ? {
        ...m,
        content: errorMsg
      } : m));
    } finally {
      setIsGenerating(false);
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



  const prompts = [t('prompt1'), t('prompt2'), t('prompt3')];

  return (
    <div className="chat-layout">
      {/* Chat pane */}
      <div className="chat-panel">
        {/* Title */}
        <div style={{ textAlign: 'center', padding: '2px 0 4px', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Bot size={32} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{t('chatAgentName')}</span>
            <span className={`led-dot ${backendStatus}`} style={{ width: 8, height: 8 }} />
          </div>
        </div>
        <div className="chat-messages">
          {messages.map(m => {
            const hasThoughts = m.thoughts && m.thoughts.length > 0;
            const open = !collapsedThoughts[m.id];
            return (
              <div key={m.id} className="chat-bubble-container">
                <div className="bubble-meta" style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant'
                    ? <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} style={{ color: 'var(--primary)' }} /></div>
                    : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14} style={{ color: 'var(--text-muted)' }} /></div>
                  }
                </div>
                <div className={`chat-bubble ${m.role}`}>
                  {m.role === 'assistant' && hasThoughts && (
                    <div style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)',
                      overflow: 'hidden',
                      marginBottom: 12,
                    }}>
                      {/* Header */}
                      <div onClick={() => toggleThoughts(m.id)} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--primary)',
                          boxShadow: '0 0 6px var(--primary-glow)',
                          animation: 'led-breath 2s ease-in-out infinite alternate'
                        }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-body)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Sparkles size={13} style={{ color: 'var(--primary)' }} /> {t('chatThoughtTrace')}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                          {m.thoughts?.length || 0} steps{m.toolCalls?.length ? ` · ${m.toolCalls.length} tools` : ''}
                        </span>
                        {open ? <ChevronUp size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />}
                      </div>
                      {open && (
                        <div style={{
                          padding: '0 14px 12px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          maxHeight: 260,
                          overflowY: 'auto'
                        }}>
                          {m.thoughts?.map((th, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, lineHeight: 1.5 }}>
                              <span style={{
                                flexShrink: 0,
                                width: 18, height: 18,
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginTop: 1
                              }}>{i + 1}</span>
                              <span style={{ color: 'var(--text-body)' }}>{th}</span>
                            </div>
                          ))}
                          {m.toolCalls?.map((tc, i) => {
                            const isSearch = tc.name.includes('db') || tc.name.includes('search') || tc.name.includes('knowledge');
                            const isCommute = tc.name.includes('commute');
                            const isWeb = tc.name.includes('web');
                            const icon = isSearch ? '🔍' : isCommute ? '🚇' : isWeb ? '🌐' : '💱';
                            const done = !!tc.result;
                            return (
                              <div key={i} style={{
                                padding: '8px 10px',
                                borderRadius: 8,
                                background: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                display: 'flex', flexDirection: 'column', gap: 4
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                  <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: done ? 'var(--success-light)' : 'var(--primary-light)',
                                    color: done ? 'var(--success)' : 'var(--primary)',
                                    fontWeight: 700,
                                  }}>{tc.name}</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                    {Object.keys(tc.args).map(k => `${k}: ${tc.args[k]}`).join(', ')}
                                  </span>
                                  {done && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: '0.7rem' }}>✓</span>}
                                </div>
                                {tc.result && (
                                  <div style={{
                                    color: 'var(--text-muted)',
                                    borderTop: '1px solid var(--border)',
                                    paddingTop: 5,
                                    marginTop: 3,
                                    maxHeight: 80,
                                    overflowY: 'auto',
                                    fontSize: '0.72rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.4
                                  }}>
                                    {JSON.stringify(tc.result).slice(0, 300)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="markdown-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {renderMarkdown(m.content)}
                  </div>
                  {m.role === 'assistant' && m.uiComponent && (
                    <div className="ui-component-wrapper">
                      {m.uiComponent.component === 'MapAndCard' && <MapAndCard {...m.uiComponent.props} />}
                      {m.uiComponent.component === 'LeaseLedgerCard' && (
                        <LeaseLedgerCard {...m.uiComponent.props} onPaymentUpdated={() => {}} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isGenerating && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span className="thinking-dot" style={{ animationDelay: '0s' }} />
                <span className="thinking-dot" style={{ animationDelay: '0.15s' }} />
                <span className="thinking-dot" style={{ animationDelay: '0.3s' }} />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t('chatThinking')}</span>
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

      <style>{`
        .led-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .led-dot.online {
          background-color: #10B981;
          box-shadow: 0 0 8px #10B981, 0 0 16px #10B981;
          animation: led-breath 2s ease-in-out infinite alternate;
        }
        .led-dot.offline {
          background-color: #F59E0B;
          box-shadow: 0 0 8px #F59E0B;
          animation: led-blink 1s ease-in-out infinite;
        }
        @keyframes led-breath {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes led-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .prompt-pill {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .prompt-pill:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: var(--primary) !important;
          background: var(--primary-light) !important;
        }
        .thinking-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.4;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
