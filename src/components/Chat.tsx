"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, User, BrainCircuit, Square, Sparkles, Globe, ExternalLink, Menu, Pencil, Check, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { TextGenerateEffect } from "./ui/text-generate-effect";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";

const ALL_SUGGESTIONS = [
  "Latest AI news",
  "Top stocks today",
  "Weather in Delhi",
  "Explain quantum computing",
  "How to start a startup",
  "Best sci-fi books 2026",
  "React vs Next.js",
  "SpaceX latest launch",
  "Healthy dinner recipes",
  "How does Bitcoin work?",
  "Global warming stats",
  "Upcoming movies 2026",
  "History of the Roman Empire",
  "How to learn piano"
];

const SUBTITLES = [
  "What do you want to research today?",
  "What's on your mind?",
  "Let's explore something new.",
  "Ready to find some answers?",
  "How can I help you today?",
  "What shall we discover?"
];

interface ChatProps {
  initialChatId?: string | null;
  initialMessages?: UIMessage[];
}

export default function Chat({ initialChatId = null, initialMessages = [] }: ChatProps = {}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const chatIdRef = useRef<string | null>(null);
  chatIdRef.current = chatId;

  // Build a stable transport that dynamically injects chatId via a body function.
  // body is Resolvable<object>, so passing a function is supported in ai v7.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ chatId: chatIdRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, stop, status } = useChat({ 
    transport,
    messages: initialMessages
  });

  useEffect(() => {
    console.log("🔥 Chat.tsx messages state:", messages);
  }, [messages]);

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeSubtitle, setActiveSubtitle] = useState("What do you want to research today?");
  const [activeSuggestions, setActiveSuggestions] = useState(ALL_SUGGESTIONS.slice(0, 4));

  useEffect(() => {
    // Randomize the subtitle
    setActiveSubtitle(SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)]);
    
    // Pick 4 random unique suggestions
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setActiveSuggestions(shuffled.slice(0, 4));
  }, []);

  const nameFallback =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";
  const displayName = isLoaded && isSignedIn ? `, ${nameFallback}` : "";
  const isLoading = status === "streaming" || status === "submitted";

  const lastScrollTime = useRef(0);
  useEffect(() => {
    const now = Date.now();
    // When the AI streams fast, triggering 'smooth' constantly causes browser jitter/stutter.
    // We throttle the smooth animation to once every 400ms, and use instant scroll in between
    // so it perfectly tracks the text without glitching.
    if (now - lastScrollTime.current > 400) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      lastScrollTime.current = now;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let currentChatId = chatId;

    if (!currentChatId) {
      try {
        const response = await fetch('/api/chat/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: input }),
        });
        const data = await response.json();
        if (data.chatId) {
          currentChatId = data.chatId;
          setChatId(currentChatId);
          chatIdRef.current = currentChatId;
        }
      } catch (error) {
        console.error("🔥 Error initializing database thread:", error);
      }
    }

    const text = input;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessage({ text });
  };

  const handleEditSubmit = async (messageId: string, index: number) => {
    if (!editingText.trim() || isLoading) return;
    setEditingMessageId(null);

    // Truncate messages after this user message and re-send
    const messagesUpToEdit = messages.slice(0, index);
    const newText = editingText;

    // Use the setMessages method isn't available, so we re-send
    // by manually popping subsequent messages from the state.
    // The simplest approach: reload page isn't ideal, instead use sendMessage
    // with the truncated history by calling setMessages if available
    // For now, set the input and let user resubmit — but do it automatically:
    setInput(newText);
    // Trigger submit after state updates
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const getMessageText = (m: any): string => {
    if (typeof m.content === "string" && m.content) return m.content;
    if (m.parts?.length > 0) {
      const text = m.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
      if (text) return text;
    }
    return "";
  };

  return (
    <>
      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 h-full z-50 md:hidden"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Chat Container ── */}
      <div className="flex-1 flex flex-col h-full bg-transparent relative z-10 w-full">

        {/* ── Mobile Top Bar ── */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Answer Engine</span>
          </div>
          <div className="w-9 h-9" /> {/* spacer for centering */}
        </div>

        {/* ── Message List ── */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto scrollbar-hide py-4 sm:py-6">
            <div className="max-w-3xl mx-auto px-3 sm:px-5 md:px-6 space-y-6 sm:space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((m: UIMessage, index: number) => {
                const isUser = m.role === "user";
                const text = getMessageText(m);

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {isUser ? (
                      /* ── User Bubble ── */
                      <div className="flex justify-end group/usermsg">
                        <div className="flex items-end gap-2 sm:gap-3 max-w-[88%] sm:max-w-[80%]">
                          {editingMessageId === m.id ? (
                            /* Edit mode */
                            <div className="flex-1 flex flex-col gap-2">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(m.id, index); }
                                  if (e.key === 'Escape') { setEditingMessageId(null); }
                                }}
                                autoFocus
                                rows={3}
                                className="w-full bg-[#1e1e1e] border border-emerald-500/40 rounded-2xl px-4 py-3 text-gray-100 text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all"
                                >
                                  <X className="w-3.5 h-3.5" /> Cancel
                                </button>
                                <button
                                  onClick={() => handleEditSubmit(m.id, index)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium transition-all shadow-lg shadow-emerald-500/20"
                                >
                                  <Check className="w-3.5 h-3.5" /> Send
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Display mode */
                            <div className="relative flex items-end gap-2">
                              <button
                                onClick={() => { setEditingMessageId(m.id); setEditingText(text); }}
                                className="opacity-0 group-hover/usermsg:opacity-100 mb-1 p-1.5 rounded-lg text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Edit message"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <div className="bg-[#1e1e1e] border border-white/[0.08] rounded-2xl rounded-br-md px-4 sm:px-5 py-3 sm:py-3.5 shadow-lg">
                                <p className="text-gray-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{text}</p>
                              </div>
                            </div>
                          )}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-700 flex items-center justify-center shrink-0 mb-0.5 overflow-hidden bg-gray-800">
                            {user?.imageUrl ? (
                              <img src={user.imageUrl} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Assistant Answer ── */
                      <div className="flex gap-2 sm:gap-4">
                        {/* Brain icon — hidden on very small screens */}
                        <div className="shrink-0 mt-1 hidden xs:flex sm:flex">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                          {/* Label + loading dots */}
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-emerald-400 sm:hidden" />
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Answer Engine</span>
                            {isLoading && index === messages.length - 1 && (
                              <span className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                  <motion.span
                                    key={i}
                                    className="w-1 h-1 rounded-full bg-emerald-400"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                  />
                                ))}
                              </span>
                            )}
                          </div>

                          {/* ── Source chips ABOVE the answer (Perplexity-style) ── */}
                          {/* ── Source chips ABOVE the answer (Perplexity-style) ── */}
                          {(() => {
                            let sources: Array<{ title: string; url: string }> = [];
                            if ((m as any).toolInvocations) {
                              (m as any).toolInvocations.forEach((inv: any) => {
                                if (inv.state === 'result' && inv.toolName === 'webSearch' && inv.result?.results) {
                                  inv.result.results.forEach((r: any) => {
                                    if (r.url && r.title && !sources.find(s => s.url === r.url)) {
                                      sources.push({ url: r.url, title: r.title });
                                    }
                                  });
                                }
                              });
                            }

                            if (!sources.length) return null;

                            return (
                              <div className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-0.5 scrollbar-hide snap-x sm:snap-none">
                                {sources.map((s, i) => {
                                  let domain = "";
                                  try { domain = new URL(s.url).hostname.replace("www.", ""); } catch {}
                                  return (
                                    <motion.a
                                      key={i}
                                      href={s.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.07, ease: "easeOut" }}
                                      className="group flex items-center gap-3 w-[200px] sm:w-60 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-emerald-500/30 transition-all cursor-pointer shrink-0 snap-start shadow-lg"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                                          className="w-5 h-5 rounded-sm object-contain"
                                          alt=""
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold truncate mb-0.5">{domain || 'Source'}</p>
                                        <p className="text-xs text-gray-200 group-hover:text-white font-medium line-clamp-2 leading-snug transition-colors">{s.title}</p>
                                      </div>
                                    </motion.a>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* ── Answer card with proper prose typography ── */}
                          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 shadow-xl backdrop-blur-sm">
                            <div className="prose prose-invert max-w-none
                              prose-p:text-gray-300 prose-p:leading-7
                              prose-headings:text-white prose-headings:font-semibold
                              prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
                              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1
                              prose-strong:text-white
                              prose-em:text-gray-300
                              prose-li:text-gray-300
                              prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                              prose-blockquote:border-emerald-500/40 prose-blockquote:text-gray-400
                              prose-hr:border-white/10
                              prose-code:text-emerald-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                              prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ node, ...props }: any) => (
                                    <a target="_blank" rel="noopener noreferrer" {...props} />
                                  ),
                                  code: ({ node, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const isBlock = !!match || String(children).includes('\n');
                                    return isBlock ? (
                                      <div className="my-4 rounded-xl overflow-hidden border border-white/10 not-prose">
                                        <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/10">
                                          <span className="text-xs font-mono text-gray-400">{match ? match[1] : "code"}</span>
                                        </div>
                                        <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-200 bg-[#0a0a0a] m-0 rounded-none">
                                          <code {...props}>{children}</code>
                                        </pre>
                                      </div>
                                    ) : (
                                      <code className="bg-white/5 text-emerald-300 px-1.5 py-0.5 rounded text-[0.875em] font-mono" {...props}>{children}</code>
                                    );
                                  },
                                  h2: ({ node, children, ...props }: any) => (
                                    <h2 className="text-white font-semibold text-lg mt-6 mb-2 pb-2 border-b border-white/10" {...props}>{children}</h2>
                                  ),
                                  h3: ({ node, children, ...props }: any) => (
                                    <h3 className="text-white font-semibold text-base mt-4 mb-1" {...props}>{children}</h3>
                                  ),
                                }}
                              >
                                {text.split('### Follow-ups')[0] + (isLoading && index === messages.length - 1 ? ' ▍' : '')}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* ── Follow Up Chips ── */}
                          {text.includes('### Follow-ups') && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Follow-ups</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {text.split('### Follow-ups')[1]
                                  .split('\n')
                                  .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
                                  .map((q, i) => {
                                    const cleanQuestion = q.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '').trim();
                                    if (!cleanQuestion) return null;
                                    return (
                                      <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => {
                                          setInput(cleanQuestion);
                                          // Small delay to allow state update before submitting
                                          setTimeout(() => {
                                            if (textareaRef.current) {
                                              textareaRef.current.focus();
                                              // Simulate form submission
                                              sendMessage({ text: cleanQuestion });
                                              setInput("");
                                            }
                                          }, 50);
                                        }}
                                        className="text-left w-full px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-pink-500/30 text-sm text-gray-300 hover:text-white transition-all cursor-pointer group flex items-start gap-3"
                                      >
                                        <span className="text-pink-400/50 group-hover:text-pink-400 mt-0.5 transition-colors">↳</span>
                                        <span className="flex-1">{cleanQuestion}</span>
                                      </motion.button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* ── Hero (empty state) ── */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 gap-8 sm:gap-12 pb-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-left w-full max-w-3xl space-y-2 sm:space-y-4"
            >
              <h2 className="text-4xl sm:text-6xl font-medium tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent pb-1">
                Hello{displayName}
              </h2>
              <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-gray-500/80">
                {activeSubtitle}
              </h2>
            </motion.div>

            {/* Suggestion Grid */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-3xl"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {activeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="flex flex-col justify-between text-left h-24 sm:h-28 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent hover:from-emerald-500/[0.08] hover:to-teal-500/[0.04] border border-white/[0.05] hover:border-emerald-500/30 transition-all cursor-pointer text-xs sm:text-sm text-gray-300 group shadow-lg"
                  >
                    <span className="line-clamp-2">{suggestion}</span>
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center self-end group-hover:bg-emerald-500/20 transition-colors">
                      <Sparkles className="w-3 h-3 text-gray-400 group-hover:text-emerald-300 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Input Box ── */}
        <div className={cn(
          "w-full max-w-3xl mx-auto px-3 sm:px-4 transition-all duration-500 shrink-0",
          messages.length === 0 ? "pb-8 sm:pb-16" : "py-3 sm:py-4"
        )}>
          <form id="chat-form" onSubmit={handleSubmit} className="relative group">
            {/* Glow border - Gemini Style Animated Glow */}
            <div className={cn(
              "absolute -inset-[2px] rounded-xl sm:rounded-2xl transition-all duration-700 ease-out z-0",
              isLoading
                ? "bg-[linear-gradient(45deg,#10b981,#14b8a6,#06b6d4,#14b8a6,#10b981)] bg-[length:200%_200%] animate-[gradient_3s_ease_infinite] blur-md opacity-80"
                : input || textareaRef.current?.matches(':focus')
                ? "bg-[linear-gradient(45deg,#10b981,#14b8a6,#06b6d4,#14b8a6,#10b981)] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] blur-sm opacity-60"
                : "bg-white/5 opacity-100"
            )} />

            <div className="relative z-10 bg-[#111] border border-white/[0.08] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                disabled={isLoading}
                className="w-full bg-transparent px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2 text-white placeholder-gray-500 focus:outline-none text-sm sm:text-base leading-relaxed resize-none min-h-[50px] sm:min-h-[56px] max-h-[160px] disabled:opacity-60"
                style={{ scrollbarWidth: "none" }}
              />

              <div className="flex items-center justify-between px-3 sm:px-4 pb-3">
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 font-mono">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{chatId ? `📟 Thread: ${chatId.substring(0,8)}...` : '🆕 New Session'}</span>
                </div>
                {/* Mobile: just a globe icon */}
                <Globe className="sm:hidden w-4 h-4 text-gray-600" />

                <div className="flex items-center gap-2">
                  {isLoading && (
                    <button
                      type="button"
                      onClick={stop}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer",
                      input.trim() && !isLoading
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 scale-100 hover:scale-105"
                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {messages.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-3 sm:mt-4 px-4">
              AI can make mistakes · Always verify important information
            </p>
          )}
        </div>
      </div>
    </>
  );
}