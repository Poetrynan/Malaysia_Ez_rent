'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Trash2, StopCircle } from 'lucide-react';
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
  thoughts: { label: string; content?: string }[];
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
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string; date: string; messages: Message[] }[]>([]);
  const currentSessionId = useRef<string>(`session-${Date.now()}`);
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

  useEffect(() => {
    // Scroll so the input area is roughly in the lower-center of the viewport
    setTimeout(() => {
      const el = messagesEndRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight;
        // If already visible in lower half, don't scroll
        if (rect.top > viewportH * 0.55) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [messages]);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ez_chat_history');
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to history when session ends or messages update
  const saveToHistory = () => {
    if (messages.length < 2) return;
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : '新对话';
    const session = {
      id: currentSessionId.current,
      title,
      date: new Date().toLocaleDateString('zh-CN'),
      messages: messages.map(m => ({ ...m })),
    };
    setChatHistory(prev => {
      const updated = [session, ...prev.filter(h => h.id !== session.id)].slice(0, 20);
      localStorage.setItem('ez_chat_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistory = (id: string) => {
    setChatHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem('ez_chat_history', JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistory = (session: typeof chatHistory[0]) => {
    setMessages(session.messages);
    setHistoryOpen(false);
  };

  const newChat = () => {
    saveToHistory();
    setMessages([]);
    currentSessionId.current = `session-${Date.now()}`;
    setHistoryOpen(false);
  };

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
        // Support both formats: {step: "label", content: "..."} or {label: "...", content: "..."}
        const label = ev.step || ev.label || '思考中...';
        thoughts.push({ label, content: ev.content });
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

  /* ── Stop Generation ── */
  const handleStop = () => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsGenerating(false);
    setElapsed(0);
    saveToHistory();
  };

  /* ── Send Message ── */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    // If currently generating, stop instead
    if (isGenerating) { handleStop(); return; }
    if (!query.trim()) return;
    const userText = query;
    setQuery('');
    setIsGenerating(true);
    setElapsed(0);

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);

    // Create abort controller
    const controller = new AbortController();
    abortRef.current = controller;

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
        method: 'POST', headers, signal: controller.signal,
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
      if (err.name === 'AbortError') {
        // User stopped — keep what was already generated
        setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: m.content || '（已停止）', contentStarted: true } : m));
      } else {
        const detail = err?.message || String(err);
        let errorMsg = '⚠️ AI 助手暂时无法响应，请稍后再试。';
        if (detail.includes('429') || detail.includes('quota')) errorMsg = '🙏 抱歉，AI 助手今日请求已达上限，请稍后再试。';
        else if (detail.includes('503')) errorMsg = '⏳ AI 助手当前繁忙，请稍等几秒后重试。';
        setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: errorMsg, contentStarted: true } : m));
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsGenerating(false);
      setElapsed(0);
      saveToHistory();
    }
  };

  /* ── Render ── */
  return (
    <div className="manus-layout">
      {/* Title bar */}
      <div className="manus-title-bar">
        <div className="manus-title-center">
          <Bot size={26} style={{ color: 'var(--primary)' }} />
          <span className="manus-title-text">{t('chatAgentName')}</span>
          <span className={`manus-status-dot ${backendStatus}`} />
        </div>
        <div className="manus-btn-group">
          <button className="manus-history-btn" onClick={() => setHistoryOpen(true)}>
            <Clock size={14} /> 历史
          </button>
          <button className="manus-history-btn" onClick={() => { if (messages.length > 0 && confirm('清空当前对话？')) { setMessages([]); saveToHistory(); } }}>
            <Trash2 size={14} /> 清空
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="manus-scroll">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="manus-welcome">
            <Bot size={48} style={{ color: 'var(--primary)' }} />
            <h2>{t('chatAgentName')}</h2>
            <p>{t('chatWelcome')}</p>
            <div className="quick-prompts">
              {(lang === 'zh' ? [
                { icon: '🚇', text: '从 Sunway Geo 到 Monash 大学要多久？' },
                { icon: '💱', text: '3000 令吉等于多少人民币？' },
                { icon: '🏘️', text: 'NILAI 附近有什么推荐的小区？' },
                { icon: '📅', text: '2026 年马来西亚有哪些公共假期？' },
                { icon: '🌐', text: '吉隆坡留学生怎么办理手机卡？' },
                { icon: '🔍', text: '帮我找便宜又安全的租房' },
              ] : [
                { icon: '🚇', text: 'How long from Sunway Geo to Monash University?' },
                { icon: '💱', text: 'How much is 3000 MYR in CNY?' },
                { icon: '🏘️', text: 'Any recommended communities near NILAI?' },
                { icon: '📅', text: 'What are the public holidays in Malaysia 2026?' },
                { icon: '🌐', text: 'How to get a SIM card in Kuala Lumpur?' },
                { icon: '🔍', text: 'Help me find affordable and safe housing' },
              ]).map((item, i) => (
                <div key={i} className="quick-prompt-card" onClick={() => setQuery(item.text)}>
                  <span className="quick-prompt-icon">{item.icon}</span>
                  <span className="quick-prompt-text">{item.text}</span>
                </div>
              ))}
            </div>
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
                <div className="manus-assistant-bubble">
                <div className="manus-assistant-content">
                  {/* Thinking steps — latest visible, completed steps auto-collapsed with ✅ */}
                  {m.thoughts.length > 0 && (() => {
                    const latest = m.thoughts[m.thoughts.length - 1];
                    const prev = m.thoughts.slice(0, -1);
                    const isExpanded = expandedThoughts.has(m.id);
                    const isLatestDone = !isGenerating || m.contentStarted;
                    return (
                      <div className="manus-thought-group">
                        {/* Completed steps — collapsed with ✅, click to expand */}
                        {prev.length > 0 && (
                          <div className="manus-thought-completed" onClick={() => setExpandedThoughts(s => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })}>
                            <CheckCircle size={14} style={{color: '#22C55E', flexShrink: 0}} />
                            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                              {isExpanded ? `▾ ${prev.length}步已完成` : `▸ ${prev.length}步已完成`}
                            </span>
                          </div>
                        )}
                        {isExpanded && prev.map((th, i) => (
                          <div key={`th-${i}`} className="manus-thought-expandable" onClick={() => setExpandedThoughts(s => { const n = new Set(s); n.has(`${m.id}-th-${i}`) ? n.delete(`${m.id}-th-${i}`) : n.add(`${m.id}-th-${i}`); return n; })}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                              <CheckCircle size={12} style={{color: '#22C55E', flexShrink: 0}} />
                              <span style={{fontSize: '0.78rem'}}>{th.label}</span>
                              {th.content && <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{expandedThoughts.has(`${m.id}-th-${i}`) ? '▾' : '▸'}</span>}
                            </div>
                            {th.content && expandedThoughts.has(`${m.id}-th-${i}`) && (
                              <div className="manus-thought-content">{th.content}</div>
                            )}
                          </div>
                        ))}
                        {/* Current (latest) step — pulsing dot, not yet done */}
                        {!isLatestDone && (
                          <div className="manus-thought">
                            <span className="manus-thought-dot pulse" />
                            <span style={{flex: 1}}>{latest.label}</span>
                            {elapsed > 0 && <span style={{fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600}}>{elapsed}s</span>}
                          </div>
                        )}
                        {/* Latest step done — show ✅ */}
                        {isLatestDone && (
                          <div className="manus-thought" style={{opacity: 0.7}}>
                            <CheckCircle size={14} style={{color: '#22C55E', flexShrink: 0}} />
                            <span>{latest.label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="manus-input-bar">
        <textarea
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            // Auto-resize textarea
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder={isGenerating ? 'AI 思考中，点击右侧按钮停止...' : t('chatPlaceholder')}
          className="manus-input"
          rows={1}
        />
        <button type="submit" className={`manus-send ${isGenerating ? 'stop-mode' : ''}`} aria-label={isGenerating ? 'Stop' : 'Send'}>
          {isGenerating ? <StopCircle size={18} /> : <Send size={16} />}
        </button>
      </form>

      {/* History overlay */}
      <div className={`manus-history-overlay ${historyOpen ? 'open' : ''}`} onClick={() => setHistoryOpen(false)} />
      <div className={`manus-history-panel ${historyOpen ? 'open' : ''}`}>
        <div className="manus-history-header">
          <h3>聊天记录</h3>
          <button className="manus-history-close" onClick={() => setHistoryOpen(false)}>
            <XCircle size={18} />
          </button>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <button onClick={newChat} style={{
            width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid var(--primary)', background: 'var(--primary-light)',
            color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>+ 新对话</button>
        </div>
        <div className="manus-history-list">
          {chatHistory.length === 0 && (
            <div className="manus-history-empty">暂无聊天记录</div>
          )}
          {chatHistory.map(h => (
            <div key={h.id} className="manus-history-item" onClick={() => loadHistory(h)}>
              <div className="manus-history-item-content">
                <div className="manus-history-item-title">{h.title}</div>
                <div className="manus-history-item-date">{h.date}</div>
              </div>
              <button className="manus-history-delete" onClick={(e) => { e.stopPropagation(); deleteHistory(h.id); }} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
