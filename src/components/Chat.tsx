"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Send, User, BrainCircuit, Square, Sparkles, Globe, ExternalLink, Menu } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { TextGenerateEffect } from "./ui/text-generate-effect";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";

const SUGGESTIONS = [
  "Latest AI news",
  "Top stocks today",
  "Weather in Delhi",
  "Explain quantum computing",
];

export default function Chat() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { messages, sendMessage, stop, status } = useChat();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const nameFallback =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";
  const displayName = isLoaded && isSignedIn ? `, ${nameFallback}` : "";
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
            <BrainCircuit className="w-5 h-5 text-pink-400" />
            <span className="text-sm font-semibold text-white">Answer Engine</span>
          </div>
          <div className="w-9 h-9" /> {/* spacer for centering */}
        </div>

        {/* ── Message List ── */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto scrollbar-hide py-4 sm:py-6">
            <div className="max-w-3xl mx-auto px-3 sm:px-5 md:px-6 space-y-6 sm:space-y-8">
              <AnimatePresence initial={false}>
                {messages.map((m, index) => {
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
                        <div className="flex justify-end">
                          <div className="flex items-end gap-2 sm:gap-3 max-w-[88%] sm:max-w-[80%]">
                            <div className="bg-[#1e1e1e] border border-white/[0.08] rounded-2xl rounded-br-md px-4 sm:px-5 py-3 sm:py-3.5 shadow-lg">
                              <p className="text-gray-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{text}</p>
                            </div>
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
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                              <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                            {/* Label + loading dots */}
                            <div className="flex items-center gap-2">
                              <BrainCircuit className="w-4 h-4 text-pink-400 sm:hidden" />
                              <span className="text-xs font-semibold text-pink-400 uppercase tracking-widest">Answer Engine</span>
                              {isLoading && index === messages.length - 1 && (
                                <span className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.span
                                      key={i}
                                      className="w-1 h-1 rounded-full bg-pink-400"
                                      animate={{ opacity: [0.3, 1, 0.3] }}
                                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                  ))}
                                </span>
                              )}
                            </div>

                            {/* ── Source chips ABOVE the answer (Perplexity-style) ── */}
                            {(() => {
                              const sourcesPart = m.parts?.find(
                                (p: any) => p.type === "custom" && p.kind === "source.chips"
                              );
                              const sources = (sourcesPart as any)?.providerMetadata?.sources as
                                | Array<{ title: string; url: string }>
                                | undefined;
                              if (!sources?.length) return null;
                              return (
                                <div className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-0.5 scrollbar-hide snap-x sm:snap-none">
                                  {sources.map((s, i) => {
                                    let domain = "";
                                    try { domain = new URL(s.url).hostname.replace("www.", ""); } catch { }
                                    return (
                                      <motion.a
                                        key={i}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.07, ease: "easeOut" }}
                                        className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-pink-500/25 transition-all cursor-pointer shrink-0 snap-start min-w-0"
                                      >
                                        <img
                                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                          className="w-4 h-4 rounded-sm bg-white/10 shrink-0"
                                          alt=""
                                        />
                                        <div className="min-w-0">
                                          <p className="text-[11px] text-gray-500 truncate">{domain || 'source'}</p>
                                          <p className="text-xs text-gray-300 group-hover:text-white font-medium line-clamp-1 transition-colors">{s.title}</p>
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-pink-400 transition-colors shrink-0 ml-0.5" />
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
                              prose-a:text-pink-400 prose-a:no-underline hover:prose-a:underline
                              prose-blockquote:border-pink-500/40 prose-blockquote:text-gray-400
                              prose-hr:border-white/10
                              prose-code:text-pink-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
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
                                        <code className="bg-white/5 text-pink-300 px-1.5 py-0.5 rounded text-[0.875em] font-mono" {...props}>{children}</code>
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
                                  {text.split('### Follow-ups')[0]}
                                </ReactMarkdown>
                              </div>
                            </div>

                            {/* ── Follow Up Chips ── */}
                            {text.includes('### Follow-ups') && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                  <Sparkles className="w-4 h-4 text-pink-400" />
                                  <span className="text-xs font-medium text-gray-400">Related Questions</span>
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
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5 sm:gap-6 pb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-pink-500/20 blur-2xl scale-150" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/10 border border-pink-500/20 flex items-center justify-center shadow-2xl">
                <BrainCircuit className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-2 px-2"
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Answer Engine</h2>
              <TextGenerateEffect
                words={`Hello${displayName}. What do you want to research today?`}
                className="text-gray-400 text-base sm:text-lg font-normal"
              />
            </motion.div>

            {/* Suggestion chips — horizontal scroll on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-full max-w-lg"
            >
              <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center pb-1 scrollbar-hide snap-x sm:snap-none px-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 text-xs sm:text-sm text-gray-400 hover:text-gray-200 transition-all cursor-pointer shrink-0 snap-start whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400 shrink-0" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Input Box ── */}
        <div className={cn(
          "w-full max-w-3xl mx-auto px-3 sm:px-4 transition-all duration-500 shrink-0",
          messages.length === 0 ? "pb-8 sm:pb-16" : "py-3 sm:py-4 border-t border-white/[0.06]"
        )}>
          <form onSubmit={handleSubmit} className="relative group">
            {/* Glow border - Gemini Style Animated Glow */}
            <div className={cn(
              "absolute -inset-[2px] rounded-xl sm:rounded-2xl transition-all duration-700 ease-out z-0",
              isLoading
                ? "bg-[linear-gradient(45deg,#4285f4,#9b72cb,#d96570,#9b72cb,#4285f4)] bg-[length:200%_200%] animate-[gradient_3s_ease_infinite] blur-md opacity-80"
                : input || textareaRef.current?.matches(':focus')
                  ? "bg-[linear-gradient(45deg,#4285f4,#9b72cb,#d96570,#9b72cb,#4285f4)] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] blur-sm opacity-60"
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
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Live web search</span>
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
                        ? "bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-500/25 scale-100 hover:scale-105"
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