'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, CheckCircle, XCircle, Clock, Trash2, StopCircle } from 'lucide-react';
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

/** Human-readable tool result — shown by default, no click required */
const renderToolResult = (name: string, result: any): React.ReactNode => {
  if (result == null) return null;

  if (name === 'get_malaysia_holidays' && typeof result === 'object') {
    const holidays = result.holidays || [];
    const year = result.year || '';
    return (
      <div className="manus-tool-preview">
        <div className="manus-tool-preview-title">{year} 年马来西亚公共假期 · 共 {holidays.length} 天</div>
        <ul className="manus-tool-preview-list">
          {holidays.slice(0, 12).map((h: any, i: number) => (
            <li key={i}><span className="manus-tool-preview-date">{h.date}</span> {h.english_name || h.name}{h.local_name ? `（${h.local_name}）` : ''}</li>
          ))}
          {holidays.length > 12 && <li className="manus-tool-preview-more">… 另有 {holidays.length - 12} 个假日</li>}
        </ul>
      </div>
    );
  }

  if (name === 'calculate_commute' && typeof result === 'object' && !result.error) {
    return (
      <div className="manus-tool-preview">
        <div className="manus-tool-preview-title">{result.origin_name} → {result.destination_name}</div>
        <div className="manus-tool-preview-row">🚗 驾车 {result.driving_duration}（{result.driving_distance}）</div>
        <div className="manus-tool-preview-row">🚊 公交 {result.transit_duration}</div>
        <div className="manus-tool-preview-row">🚶 步行 {result.walk_duration}</div>
      </div>
    );
  }

  if (name === 'convert_currency_frankfurter' && typeof result === 'object' && result.success) {
    return (
      <div className="manus-tool-preview">
        <div className="manus-tool-preview-title">{result.amount} {result.base} = {result.converted_amount} {result.quote}</div>
        <div className="manus-tool-preview-row">汇率 1 {result.base} = {result.rate} {result.quote}</div>
      </div>
    );
  }

  if (name === 'search_knowledge_base' && Array.isArray(result)) {
    return (
      <div className="manus-tool-preview">
        <div className="manus-tool-preview-title">🔍 已检索内部数据库 · 找到 {result.length} 个小区</div>
        <ul className="manus-tool-preview-list">
          {result.slice(0, 5).map((item: any, i: number) => (
            <li key={i}>
              <strong>{item.community || item.community_name}</strong>
              {item.price ? ` · ${item.price}` : item.price_range ? ` · RM${item.price_range.min}-${item.price_range.max}` : ''}
              {item.rating || item.tenant_rating?.overall ? ` · ⭐${item.rating || item.tenant_rating?.overall}` : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (name === 'get_web_realtime_info' && typeof result === 'string') {
    return <div className="manus-tool-preview"><p className="manus-tool-preview-text">{result.slice(0, 500)}{result.length > 500 ? '…' : ''}</p></div>;
  }

  // search_external_listings — safe summary only; raw titles/URLs/phones/platform names are never displayed
  if (name === 'search_external_listings' && typeof result === 'object') {
    if (!result.success) {
      return <div className="manus-tool-preview"><div className="manus-tool-preview-row">⚠️ 未找到相关外部房源</div></div>;
    }
    const listings = result.listings || [];
    const count = result.total_results ?? listings.length;
    const prices = listings.map((l: any) => l.price_myr).filter((p: any) => typeof p === 'number' && p > 0);
    const priceRange = prices.length > 0
      ? `RM${Math.min(...prices)}-${Math.max(...prices)}`
      : '';
    return (
      <div className="manus-tool-preview">
        <div className="manus-tool-preview-title">🔍 已搜索外部平台 · 找到 {count} 条房源</div>
        {priceRange && <div className="manus-tool-preview-row">价格区间：{priceRange}</div>}
      </div>
    );
  }

  if (typeof result === 'string') {
    return <div className="manus-tool-preview"><p className="manus-tool-preview-text">{result.slice(0, 600)}{result.length > 600 ? '…' : ''}</p></div>;
  }

  if (Array.isArray(result)) {
    return <div className="manus-tool-preview"><div className="manus-tool-preview-title">共 {result.length} 条结果</div></div>;
  }

  return (
    <div className="manus-tool-preview">
      <pre className="manus-tool-preview-raw">{JSON.stringify(result, null, 2).slice(0, 800)}{JSON.stringify(result).length > 800 ? '\n…' : ''}</pre>
    </div>
  );
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection: line starts with | and next line is separator
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s\-:|]+\|/)) {
      const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
        i++;
      }
      elements.push(
        <table key={`tbl-${elements.length}`} className="md-table">
          <thead><tr>{headers.map((h, hi) => <th key={hi}>{renderInline(h)}</th>)}</tr></thead>
          <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h4 key={`h4-${i}`} className="md-h4">{renderInline(line.slice(4))}</h4>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h3 key={`h3-${i}`} className="md-h3">{renderInline(line.slice(3))}</h3>); i++; continue; }
    if (line.startsWith('# ')) { elements.push(<h2 key={`h2-${i}`} className="md-h2">{renderInline(line.slice(2))}</h2>); i++; continue; }

    // Horizontal rule
    if (line.match(/^[\-\*_]{3,}$/)) { elements.push(<hr key={`hr-${i}`} className="md-hr" />); i++; continue; }

    // Blockquote
    if (line.startsWith('> ')) { elements.push(<blockquote key={`bq-${i}`} className="md-quote">{renderInline(line.slice(2))}</blockquote>); i++; continue; }

    // Unordered list (collect consecutive)
    if (line.match(/^[\-\*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*] /)) {
        items.push(lines[i].replace(/^[\-\*] /, ''));
        i++;
      }
      elements.push(<ul key={`ul-${elements.length}`} className="md-ul">{items.map((item, j) => <li key={j} className="md-li">{renderInline(item)}</li>)}</ul>);
      continue;
    }

    // Ordered list (collect consecutive)
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(<ol key={`ol-${elements.length}`} className="md-ol">{items.map((item, j) => <li key={j} className="md-li">{renderInline(item)}</li>)}</ol>);
      continue;
    }

    // Empty line
    if (!line.trim()) { elements.push(<div key={`br-${i}`} className="md-br" />); i++; continue; }

    // Paragraph
    elements.push(<p key={`p-${i}`} className="md-p">{renderInline(line)}</p>);
    i++;
  }

  return <>{elements}</>;
};

// Helper: render inline formatting (bold, code, links, <br> line breaks)
const renderInline = (text: string): React.ReactNode => {
  // Normalize HTML line breaks the model sometimes emits inside table cells.
  const segments = text.split(/<br\s*\/?>/gi);
  const out: React.ReactNode[] = [];
  segments.forEach((segment, si) => {
    if (si > 0) out.push(<br key={`br-${si}`} />);
    const parts = segment.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
    parts.forEach((part, j) => {
      const key = `${si}-${j}`;
      if (part.startsWith('**') && part.endsWith('**')) { out.push(<strong key={key}>{part.slice(2, -2)}</strong>); return; }
      if (part.startsWith('`') && part.endsWith('`')) { out.push(<code key={key} className="md-code">{part.slice(1, -1)}</code>); return; }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) { out.push(<a key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="md-link">{linkMatch[1]}</a>); return; }
      if (part) out.push(<React.Fragment key={key}>{part}</React.Fragment>);
    });
  });
  return out;
};

interface GlobalChatState {
  messages: Message[];
  isGenerating: boolean;
  elapsed: number;
  currentSessionId: string;
  abortController: AbortController | null;
  timerInterval: NodeJS.Timeout | null;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
  startGeneration: (query: string, userId: string, authToken: string, apiUrl: string, lang: string) => Promise<void>;
  stopGeneration: () => void;
}

let globalChatState: GlobalChatState | null = null;

function getGlobalChatState(initialSessionId: string): GlobalChatState {
  if (globalChatState) return globalChatState;

  // Attempt to load current messages on initial load
  let initialMsgs: Message[] = [];
  let savedSessionId = initialSessionId;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('ez_current_messages');
      if (saved) initialMsgs = JSON.parse(saved);
      const savedId = localStorage.getItem('ez_current_session_id');
      if (savedId) savedSessionId = savedId;
    } catch {}
  }

  globalChatState = {
    messages: initialMsgs,
    isGenerating: false,
    elapsed: 0,
    currentSessionId: savedSessionId,
    abortController: null,
    timerInterval: null,
    listeners: new Set(),

    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    },

    notify() {
      this.listeners.forEach(l => l());
      // Save current messages to localStorage
      if (typeof window !== 'undefined') {
        try {
          if (this.messages.length > 0) {
            localStorage.setItem('ez_current_messages', JSON.stringify(this.messages));
          } else {
            localStorage.removeItem('ez_current_messages');
          }
          localStorage.setItem('ez_current_session_id', this.currentSessionId);
        } catch {}
      }
    },

    stopGeneration() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (this.isGenerating) {
        this.isGenerating = false;
        this.elapsed = 0;
        
        // Append (stopped) text if generation stopped mid-way
        const aid = this.messages.length > 0 ? this.messages[this.messages.length - 1].id : '';
        if (aid) {
          this.messages = this.messages.map(m =>
            m.id === aid ? { ...m, content: m.content || '（已停止）', contentStarted: true } : m
          );
        }
        this.notify();
      }
    },

    async startGeneration(query, userId, authToken, apiUrl, lang) {
      this.stopGeneration();

      this.isGenerating = true;
      this.elapsed = 0;
      const startTime = Date.now();
      this.timerInterval = setInterval(() => {
        if (globalChatState) {
          globalChatState.elapsed = Math.floor((Date.now() - startTime) / 1000);
          globalChatState.notify();
        }
      }, 1000);

      const controller = new AbortController();
      this.abortController = controller;

      const uid = `msg-u-${Date.now()}`;
      const aid = `msg-a-${Date.now()}`;
      
      this.messages = [
        ...this.messages,
        { id: uid, role: 'user', content: query, thoughts: [], tools: [], uiComponents: [], contentStarted: false },
        { id: aid, role: 'assistant', content: '', thoughts: [], tools: [], uiComponents: [], contentStarted: false }
      ];
      this.notify();

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch(`${apiUrl}/api/chat`, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            query,
            user_id: userId,
            history: this.messages.slice(0, -2).map(m => ({ role: m.role, content: m.content || m.thoughts.join(' ') }))
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('no body');

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';

        const processBuf = (remaining: boolean) => {
          const lines = buf.split('\n');
          buf = remaining ? (lines.pop() || '') : '';
          for (const l of lines) {
            if (l.startsWith('data: ')) {
              try {
                const ev = JSON.parse(l.slice(6));
                this.messages = this.messages.map(m => {
                  if (m.id !== aid) return m;
                  const thoughts = [...m.thoughts];
                  const tools = [...m.tools];
                  let content = m.content;
                  let contentStarted = m.contentStarted;
                  const uiComponents = [...m.uiComponents];

                  if (ev.type === 'thinking') {
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
                });
                this.notify();
              } catch {}
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            buf += dec.decode(value, { stream: true });
            processBuf(true);
          }
        }
        if (buf.trim()) processBuf(false);

      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Handled or component-triggered abort
        } else {
          const detail = err?.message || String(err);
          let errorMsg = '⚠️ AI 助手暂时无法响应，请稍后再试。';
          if (detail.includes('429') || detail.includes('quota')) errorMsg = '🙏 抱歉，AI 助手今日请求已达上限，请稍后再试。';
          else if (detail.includes('503')) errorMsg = '⏳ AI 助手当前繁忙，请稍等几秒后重试。';
          
          this.messages = this.messages.map(m =>
            m.id === aid ? { ...m, content: errorMsg, contentStarted: true } : m
          );
          this.notify();
        }
      } finally {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        this.isGenerating = false;
        this.elapsed = 0;
        this.notify();

        // Save to chat history
        if (typeof window !== 'undefined') {
          try {
            const savedHistory = localStorage.getItem('ez_chat_history');
            const history = savedHistory ? JSON.parse(savedHistory) : [];
            const firstUserMsg = this.messages.find(m => m.role === 'user');
            const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : '新对话';
            const session = {
              id: this.currentSessionId,
              title,
              date: new Date().toLocaleDateString('zh-CN'),
              messages: this.messages.map(m => ({ ...m })),
            };
            const updated = [session, ...history.filter((h: any) => h.id !== session.id)].slice(0, 20);
            localStorage.setItem('ez_chat_history', JSON.stringify(updated));
          } catch {}
        }
      }
    }
  };

  return globalChatState;
}

/* ── Component ── */
export default function AIChat() {
  const { t, lang } = useApp();
  const [query, setQuery] = useState('');
  
  // Get/create global chat state
  const chatState = getGlobalChatState(`session-${Date.now()}`);

  const [messages, setMessages] = useState<Message[]>(chatState.messages);
  const [isGenerating, setIsGenerating] = useState(chatState.isGenerating);
  const [elapsed, setElapsed] = useState(chatState.elapsed);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string; date: string; messages: Message[] }[]>([]);
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ez_tenant_id') || 'tenant-123';
    return 'tenant-123';
  });

  // Subscribe to global chat state changes
  useEffect(() => {
    setMessages(chatState.messages);
    setIsGenerating(chatState.isGenerating);
    setElapsed(chatState.elapsed);

    const unsubscribe = chatState.subscribe(() => {
      setMessages(chatState.messages);
      setIsGenerating(chatState.isGenerating);
      setElapsed(chatState.elapsed);
      
      // Also sync history if it changes in localStorage
      try {
        const saved = localStorage.getItem('ez_chat_history');
        if (saved) setChatHistory(JSON.parse(saved));
      } catch {}
    });

    return unsubscribe;
  }, [chatState]);

  // Load backend status and user on mount
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

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      const el = messagesEndRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportH = window.innerHeight;
        if (rect.top > viewportH * 0.55) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [messages]);

  // Load initial chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ez_chat_history');
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const deleteHistory = (id: string) => {
    setChatHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem('ez_chat_history', JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistory = (session: typeof chatHistory[0]) => {
    chatState.messages = session.messages;
    chatState.currentSessionId = session.id;
    chatState.notify();
    setHistoryOpen(false);
  };

  const newChat = () => {
    // Trigger save to history first if there are messages
    if (chatState.messages.length >= 2) {
      try {
        const savedHistory = localStorage.getItem('ez_chat_history');
        const history = savedHistory ? JSON.parse(savedHistory) : [];
        const firstUserMsg = chatState.messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : '新对话';
        const session = {
          id: chatState.currentSessionId,
          title,
          date: new Date().toLocaleDateString('zh-CN'),
          messages: chatState.messages.map(m => ({ ...m })),
        };
        const updated = [session, ...history.filter((h: any) => h.id !== session.id)].slice(0, 20);
        localStorage.setItem('ez_chat_history', JSON.stringify(updated));
        setChatHistory(updated);
      } catch {}
    }

    chatState.messages = [];
    chatState.currentSessionId = `session-${Date.now()}`;
    chatState.notify();
    setHistoryOpen(false);
  };


  const handleStop = () => {
    chatState.stopGeneration();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) {
      chatState.stopGeneration();
      return;
    }
    if (!query.trim()) return;
    const userText = query;
    setQuery('');

    let authToken = '';
    try {
      const { supabase, isMockDatabase } = await import('@/lib/supabase');
      if (!isMockDatabase) {
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || '';
      }
    } catch {}

    const apiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://127.0.0.1:8000';
    chatState.startGeneration(userText, userId, authToken, apiUrl, lang);
  };

  /* ── Render ── */
  return (
    <div className="manus-page">
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
          <button className="manus-history-btn" onClick={() => {
            if (messages.length > 0 && confirm('清空当前对话？')) {
              if (chatState.messages.length >= 2) {
                try {
                  const savedHistory = localStorage.getItem('ez_chat_history');
                  const history = savedHistory ? JSON.parse(savedHistory) : [];
                  const firstUserMsg = chatState.messages.find(m => m.role === 'user');
                  const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : '新对话';
                  const session = {
                    id: chatState.currentSessionId,
                    title,
                    date: new Date().toLocaleDateString('zh-CN'),
                    messages: chatState.messages.map(m => ({ ...m })),
                  };
                  const updated = [session, ...history.filter((h: any) => h.id !== session.id)].slice(0, 20);
                  localStorage.setItem('ez_chat_history', JSON.stringify(updated));
                  setChatHistory(updated);
                } catch {}
              }
              chatState.messages = [];
              chatState.notify();
            }
          }}>
            <Trash2 size={14} /> 清空
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="manus-scroll">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="manus-welcome" style={{ paddingTop: '32px' }}>
            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.7', textAlign: 'center', fontSize: '0.92rem' }}>{t('chatWelcome')}</p>
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
                <div className="manus-avatar"><User size={18} /></div>
                <div className="manus-user-text">{m.content}</div>
              </div>
            )}

            {/* Assistant message */}
            {m.role === 'assistant' && (
              <div className="manus-assistant">
                <div className="manus-avatar assistant"><Bot size={18} /></div>
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
                            <span style={{flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>{latest.label}</span>
                            {elapsed > 0 && <span style={{fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, flexShrink: 0}}>{elapsed}s</span>}
                          </div>
                        )}
                        {/* Latest step done — show ✅ */}
                        {isLatestDone && (
                          <div className="manus-thought" style={{opacity: 0.7}}>
                            <CheckCircle size={14} style={{color: '#22C55E', flexShrink: 0}} />
                            <span style={{flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>{latest.label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tool cards */}
                  {m.tools.map(tc => (
                    <div key={tc.id} className={`manus-tool-card ${tc.status}`}>
                      <div className="manus-tool-header">
                        <span className="manus-tool-icon">{toolIcon(tc.name)}</span>
                        <span className="manus-tool-name">{tc.name}</span>
                        <span className={`manus-tool-status ${tc.status}`}>
                          {tc.status === 'running' && <span className="tool-spinner" />}
                          {tc.status === 'done' && <CheckCircle size={14} />}
                          {tc.status === 'error' && <XCircle size={14} />}
                        </span>
                        {/* Raw JSON toggle removed — never show raw data to users */}
                      </div>
                      <div className="manus-tool-args">
                        {Object.entries(tc.args).map(([k, v]) => (
                          <span key={k} className="manus-tool-arg" title={`${k}: ${v}`}>{k}: <code>{String(v)}</code></span>
                        ))}
                      </div>
                      {/* Readable preview — always visible when done, no click needed */}
                      {tc.status === 'done' && tc.result && (
                        <div className="manus-tool-body">
                          {renderToolResult(tc.name, tc.result)}
                        </div>
                      )}
                      {/* Raw JSON panel removed — data stays internal, only renderToolResult() previews are shown */}
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
    </div>

    {/* Input — fixed at page bottom, outside manus-layout */}
    <div className="manus-input-area">
      <form onSubmit={handleSend} className="manus-input-bar">
        <textarea
          value={query}
          onChange={e => {
            setQuery(e.target.value);
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
      <div className="manus-disclaimer">此结果由 AI 生成，请仔细甄别</div>
    </div>

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
