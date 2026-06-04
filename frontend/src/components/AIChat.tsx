'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
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
  const [resultsPanel, setResultsPanel] = useState<{ component: string; props: any }[]>([]);
  const [toolBoardCards, setToolBoardCards] = useState<{ name: string; args: any; result?: any; status: 'running' | 'done' }[]>([]);
  const [textStarted, setTextStarted] = useState(false);
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
    setToolBoardCards([]);
    setTextStarted(false);
    setResultsPanel([]);
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
      let content = m.content;
      if (ev.type === 'thinking') {
        thoughts.push(ev.step);
      } else if (ev.type === 'tool_call') {
        setToolBoardCards(prev => [...prev, { name: ev.tool_name, args: ev.args, status: 'running' }]);
      } else if (ev.type === 'tool_result') {
        setToolBoardCards(prev => prev.map((c, i) => i === prev.length - 1 ? { ...c, result: ev.result, status: 'done' } : c));
      } else if (ev.type === 'text') {
        content += ev.delta;
        setTextStarted(true);
      } else if (ev.type === 'ui_component') {
        setResultsPanel(prev => [...prev, { component: ev.component, props: ev.props }]);
      }
      return { ...m, content, thoughts };
    }));
  };



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
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span style={{ color: 'var(--primary)', fontSize: '0.6rem' }}>●</span>
                      {m.thoughts?.length || 0} 步推理
                    </div>
                  )}
                  <div className="markdown-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {renderMarkdown(m.content)}
                  </div>
                </div>
              </div>
            );
          })}
          {isGenerating && !textStarted && toolBoardCards.length === 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 14px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t('chatThinking')}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('chatPlaceholder')} className="chat-input" disabled={isGenerating} />
          <button type="submit" className="send-button" disabled={isGenerating} aria-label="Send"><Send size={16} /></button>
        </form>
      </div>

      {/* Results panel (right side) */}
      <div className="results-panel">
        {/* Phase 1: Tool execution board */}
        {!textStarted && toolBoardCards.length > 0 && (
          <div className="tool-board">
            {toolBoardCards.map((card, i) => {
              const icon = card.name.includes('search') || card.name.includes('knowledge') ? '🔍'
                : card.name.includes('commute') ? '🚇'
                : card.name.includes('web') ? '🌐' : '💱';
              return (
                <div key={i} className={`tool-board-card ${card.status}`}>
                  <div className="tool-board-card-header">
                    <span className="tool-board-icon">{icon}</span>
                    <span className="tool-board-name">{card.name}</span>
                    <span className={`tool-board-status ${card.status}`}>
                      {card.status === 'running'
                        ? <span className="tool-spinner" />
                        : '✓'
                      }
                    </span>
                  </div>
                  <div className="tool-board-args">
                    {Object.entries(card.args).map(([k, v]) => (
                      <span key={k} className="tool-board-arg">{k}: {String(v)}</span>
                    ))}
                  </div>
                  {card.status === 'done' && card.result && (
                    <div className="tool-board-result">
                      {typeof card.result === 'object'
                        ? `${Array.isArray(card.result) ? card.result.length + ' 条结果' : '完成'}`
                        : String(card.result).slice(0, 80)
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Phase 1b: Thinking indicator (no tools yet) */}
        {!textStarted && toolBoardCards.length === 0 && isGenerating && (
          <div className="results-empty">
            <div className="thinking-dots">
              <span className="thinking-dot" style={{ animationDelay: '0s' }} />
              <span className="thinking-dot" style={{ animationDelay: '0.15s' }} />
              <span className="thinking-dot" style={{ animationDelay: '0.3s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>分析中...</span>
          </div>
        )}

        {/* Phase 2: Tool cards summary + Map/Cards */}
        {textStarted && (
          <div className="results-content">
            {/* Compact tool summary */}
            {toolBoardCards.length > 0 && (
              <div className="tool-summary">
                {toolBoardCards.map((card, i) => (
                  <div key={i} className="tool-summary-item">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span>{card.name}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Map/Cards */}
            {resultsPanel.map((item, i) => (
              <div key={i} className="ui-component-wrapper">
                {item.component === 'MapAndCard' && <MapAndCard {...item.props} />}
                {item.component === 'LeaseLedgerCard' && (
                  <LeaseLedgerCard {...item.props} onPaymentUpdated={() => {}} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isGenerating && toolBoardCards.length === 0 && resultsPanel.length === 0 && (
          <div className="results-empty">
            <Bot size={48} style={{ color: 'var(--border)', opacity: 0.5 }} />
            <span style={{ fontSize: '0.9rem' }}>{t('chatWelcome')}</span>
          </div>
        )}
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
