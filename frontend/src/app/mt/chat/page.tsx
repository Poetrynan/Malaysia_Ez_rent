'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useApp } from '@/lib/ThemeProvider';
import { Send, Bot, User, Loader2, MapPin, Search, Home, GraduationCap, DollarSign, Calendar } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: { name: string; status: 'running' | 'done' | 'error' }[];
}

const QUICK_PROMPTS = [
  { icon: Home, zh: '帮我找 Sunway 的房子', en: 'Find rooms in Sunway' },
  { icon: MapPin, zh: '从 GEO 到莫纳什要多久', en: 'Commute from GEO to Monash' },
  { icon: DollarSign, zh: 'RM 1500 等于多少人民币', en: 'Convert RM 1500 to CNY' },
  { icon: Calendar, zh: '2026 马来西亚公共假期', en: '2026 Malaysia public holidays' },
  { icon: GraduationCap, zh: 'Taylor\'s 大学附近推荐', en: 'Recommendations near Taylor\'s' },
  { icon: Search, zh: 'Nilai 有 Studio 吗', en: 'Any Studio in Nilai' },
];

export default function MobileChatPage() {
  const { role, userEmail } = useAuth();
  const { lang, t } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', tools: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000';
      const history = messages.filter(m => m.role !== 'assistant' || m.content).map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buf = '';
      let finalText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              finalText += parsed.content;
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: finalText } : m));
            } else if (parsed.type === 'tool_call') {
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, tools: [...(m.tools || []), { name: parsed.name, status: 'running' }] } : m));
            } else if (parsed.type === 'tool_result') {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsg.id) return m;
                const tools = [...(m.tools || [])];
                const last = tools[tools.length - 1];
                if (last) last.status = 'done';
                return { ...m, tools };
              }));
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errMsg = e.message?.includes('Failed to fetch')
          ? (lang === 'zh' ? '无法连接到 AI 服务，请检查后端是否运行' : 'Cannot connect to AI service')
          : (lang === 'zh' ? 'AI 服务暂时不可用' : 'AI service unavailable');
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: errMsg } : m));
      }
    } finally { setStreaming(false); abortRef.current = null; }
  }, [streaming, messages, lang]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 10px 20px' }}>
            <Bot size={40} style={{ color: 'var(--primary)', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
              {lang === 'zh' ? 'AI 租房助手' : 'AI Rental Assistant'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              {lang === 'zh' ? '找房、通勤、汇率、假期，问我就行' : 'Find rooms, commute, currency, holidays — ask me anything'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {QUICK_PROMPTS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button key={i} onClick={() => sendMessage(lang === 'zh' ? p.zh : p.en)} style={{
                    padding: '14px 10px', borderRadius: 14, border: '1px solid var(--glass-border)',
                    background: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.2s',
                  }}>
                    <Icon size={18} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-body)', fontWeight: 500 }}>
                      {lang === 'zh' ? p.zh : p.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', gap: 8, marginBottom: 14, padding: '0 4px',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--gradient-primary)' : 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'user' ? <User size={14} style={{ color: 'white' }} /> : <Bot size={14} style={{ color: 'var(--primary)' }} />}
            </div>
            <div style={{ maxWidth: '80%', minWidth: 0 }}>
              {/* Tool cards */}
              {msg.tools?.map((tool, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 4,
                  borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--glass-border)',
                  fontSize: '0.7rem', color: 'var(--text-body)',
                }}>
                  {tool.status === 'running'
                    ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    : <span style={{ color: 'var(--success)' }}>✓</span>}
                  {tool.name}
                </div>
              ))}
              <style>{`.animate-spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

              {/* Message bubble */}
              {msg.content && (
                <div style={{
                  padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-body)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                  fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  boxShadow: msg.role === 'user' ? '0 2px 8px var(--primary-glow)' : 'none',
                }}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '8px 0', borderTop: '1px solid var(--glass-border)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder={lang === 'zh' ? '问我任何问题...' : 'Ask me anything...'}
          disabled={streaming}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: '0.85rem',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-h)',
            outline: 'none', boxSizing: 'border-box',
          }} />
        <button onClick={() => sendMessage(input)} disabled={streaming || !input.trim()} style={{
          width: 40, height: 40, borderRadius: 10, border: 'none', cursor: streaming ? 'not-allowed' : 'pointer',
          background: input.trim() ? 'var(--primary)' : 'var(--glass-bg)',
          color: input.trim() ? 'white' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          opacity: streaming ? 0.6 : 1,
        }}>
          {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
