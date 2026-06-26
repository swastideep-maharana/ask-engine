"use client";

import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Send, Sparkles, User } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Interface component for user chat query input
export default function Chat() {
  const { user, isSignedIn } = useUser();
  
  // In AI SDK v7, useChat returns UseChatHelpers which contains messages, sendMessage, stop, and status.
  // Input state and handlers are managed locally.
  const { messages, sendMessage, stop, status } = useChat();
  const [input, setInput] = useState("");

  const displayName = isSignedIn && user ? `, ${user.firstName || user.username || "User"}` : "";
  const isLoading = status === "streaming" || status === "submitted";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-dark">
      
      {/* Chat History Area */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full flex flex-col ${
        messages.length === 0 ? "justify-center items-center" : ""
      }`}>
        {/* The Welcome Message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center gap-6 max-w-lg">
            {/* Brand/Sparkle Icon Container */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">Answer Engine</h2>
              <p className="text-gray-400 text-lg">
                Hello{displayName}. What do you want to research today?
              </p>
            </div>
          </div>
        )}

        {/* Loop through all messages in the conversation */}
        <div className="space-y-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-4 p-4 rounded-2xl transition-all duration-200 ${
                m.role === 'user'
                  ? 'bg-sidebar/50 border border-gray-800/30'
                  : 'bg-transparent'
              }`}
            >
              {/* Avatar Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                m.role === 'user'
                  ? 'bg-gray-800 text-gray-300'
                  : 'bg-gradient-to-tr from-brand to-purple-500 text-white'
              }`}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              
              {/* Message Content */}
              <div className="flex-1 space-y-1">
                <div className="text-sm font-semibold text-gray-400">
                  {m.role === 'user' ? 'You' : 'Answer Engine'}
                </div>
                {/* Render Text Parts as Markdown */}
                <div className="text-white text-base leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Style bold text
                      strong: ({ node, ...props }: any) => (
                        <strong className="font-semibold text-white" {...props} />
                      ),
                      // Style bullet lists
                      ul: ({ node, ...props }: any) => (
                        <ul className="list-disc pl-5 my-2 space-y-1 text-gray-300" {...props} />
                      ),
                      ol: ({ node, ...props }: any) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1 text-gray-300" {...props} />
                      ),
                      // Style links
                      a: ({ node, ...props }: any) => (
                        <a
                          className="text-brand hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      // Style code blocks (inline and multi-line)
                      code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || "");
                        const inline = !className;
                        return inline ? (
                          <code className="bg-sidebar px-1.5 py-0.5 rounded text-sm text-pink-400 font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <div className="my-4 overflow-hidden rounded-xl border border-gray-800 bg-sidebar shadow-md">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-sidebar/50 text-xs text-gray-400 font-mono">
                              <span>{match ? match[1] : "code"}</span>
                            </div>
                            <pre className="p-4 overflow-x-auto text-sm text-gray-200 font-mono bg-sidebar/30">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      },
                    }}
                  >
                    {m.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join("")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Input Box */}
      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full bg-background-dark border-t border-gray-800/40">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything..."
            className="w-full bg-sidebar border border-gray-800 focus:border-gray-700 rounded-2xl px-5 py-4 pr-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 shadow-2xl transition-all duration-200 text-base"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="absolute right-3 p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer flex items-center justify-center"
            >
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-3 p-2.5 rounded-xl bg-brand hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 text-white transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
        
        <p className="text-center text-xs text-gray-500 mt-4 tracking-wide">
          AI can make mistakes. Check important info.
        </p>
      </div>

    </div>
  );
}