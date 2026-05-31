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
      let errorMsg: string;
      if (is401) {
        errorMsg = lang === 'zh'
          ? '⚠️ 认证失败，请重新登录后再试。'
          : '⚠️ Authentication failed. Please log in and try again.';
      } else if (isNetwork) {
        errorMsg = lang === 'zh'
          ? `⚠️ 无法连接到 AI 后端服务 (${apiUrl})，请检查网络或稍后再试。`
          : `⚠️ Cannot reach AI backend (${apiUrl}). Please check your network or try again later.`;
      } else {
        errorMsg = lang === 'zh'
          ? `⚠️ AI 助手请求出错: ${detail}`
          : `⚠️ AI assistant error: ${detail}`;
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
                    <div style={{
                      background: '#1E1E2E',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      marginBottom: 12,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}>
                      {/* MacOS Title Bar */}
                      <div onClick={() => toggleThoughts(m.id)} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        background: '#181825',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171' }} />
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24' }} />
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#A6ADC8', fontFamily: 'monospace', fontWeight: 600, marginLeft: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Terminal size={12} /> {t('chatThoughtTrace')}
                        </span>
                        {open ? <ChevronUp size={13} style={{ marginLeft: 'auto', color: '#CDD6F4' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto', color: '#CDD6F4' }} />}
                      </div>
                      {open && (
                        <div style={{
                          padding: '12px 14px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          fontSize: '0.78rem',
                          color: '#CDD6F4',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          maxHeight: 240,
                          overflowY: 'auto'
                        }}>
                          {m.thoughts?.map((th, i) => (
                            <div key={i} style={{ color: '#BAC2DE', lineHeight: 1.4 }}>
                              <span style={{ color: '#F5E0DC', marginRight: 6 }}>›</span> {th}
                            </div>
                          ))}
                          {m.toolCalls?.map((tc, i) => {
                            const isSearch = tc.name.includes('db') || tc.name.includes('search');
                            const isCommute = tc.name.includes('commute');
                            const isWeb = tc.name.includes('web');
                            const badgeColor = isSearch ? '#89B4FA' : isCommute ? '#A6E3A1' : isWeb ? '#F9E2AF' : '#F5C2E7';
                            return (
                              <div key={i} style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                background: '#11111B',
                                border: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: badgeColor + '1F',
                                    color: badgeColor,
                                    fontWeight: 700,
                                    fontFamily: 'monospace'
                                  }}>{tc.name}</span>
                                  <span style={{ color: '#A6ADC8', fontSize: '0.72rem' }}>({Object.keys(tc.args).map(k => `${k}: ${tc.args[k]}`).join(', ')})</span>
                                </div>
                                {tc.result && (
                                  <div style={{
                                    color: '#89DCEB',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    paddingTop: 6,
                                    marginTop: 6,
                                    maxHeight: 100,
                                    overflowY: 'auto',
                                    fontSize: '0.72rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                  }}>
                                    <span style={{ color: '#F38BA8' }}>→</span> {JSON.stringify(tc.result).slice(0, 400)}
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
                    <div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '8px 12px', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`led-dot ${backendStatus}`} />
              <span style={{ color: backendStatus === 'online' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                {backendStatus === 'online' ? t('agentConnected') : t('agentOffline')}
              </span>
            </div>
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
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .chat-bubble.assistant {
          box-shadow: var(--glass-shadow), 0 2px 8px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
