"use client";

import { useState, useEffect } from "react";
import { SignInButton, SignUpButton, UserButton, useUser, useClerk } from "@clerk/nextjs";
import { Plus, Compass, Library, Settings, Sparkles, PanelLeftClose, PanelLeftOpen, Search, BrainCircuit, MessageSquare, Trash2, Edit2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { isSignedIn, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pastChats, setPastChats] = useState<any[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSyncing, setIsSyncing] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const fetchChats = () => {
    if (isSignedIn) {
      setIsSyncing(true);
      fetch('/api/chats')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPastChats(data);
          }
        })
        .catch(err => console.error("Failed to fetch past chats:", err))
        .finally(() => setIsSyncing(false));
    } else {
      setPastChats([]);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [isSignedIn, pathname]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault(); // Prevent navigating to the chat
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setPastChats(prev => prev.filter(c => c.id !== chatId));
        // If we deleted the chat we are currently viewing, go to home
        if (pathname === `/chat/${chatId}`) {
          router.push('/');
        }
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleRenameStart = (e: React.MouseEvent, chat: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || "New Chat");
  };

  const handleRenameSubmit = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle })
      });
      if (res.ok) {
        setPastChats(prev => prev.map(c => c.id === chatId ? { ...c, title: editingTitle } : c));
      }
    } catch (err) {
      console.error("Failed to rename chat", err);
    }
    setEditingChatId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleRenameSubmit(chatId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setEditingChatId(null);
    }
  };

  return (
    <aside 
      className={cn(
        "border-r border-gray-800/60 bg-[#111111] p-4 flex flex-col z-50 shadow-xl transition-all duration-300 ease-in-out h-full",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* Logo & Collapse Toggle */}
      <div className={cn("flex items-center mb-8 cursor-pointer group", isCollapsed ? "justify-center" : "justify-between px-2")}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="Expand Sidebar"
          >
            <BrainCircuit className="w-6 h-6 text-emerald-500 drop-shadow-md" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <BrainCircuit className="w-6 h-6 text-emerald-500 drop-shadow-md" />
              </div>
              <h1 className="text-xl font-semibold text-gray-200 truncate">Answer Engine</h1>
            </div>
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      
      {/* New Thread Button */}
      {isCollapsed ? (
        <button onClick={() => router.push('/')} className="w-full flex justify-center p-3 mb-6 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-200 transition-all cursor-pointer">
          <Plus className="w-5 h-5" />
        </button>
      ) : (
        <button onClick={() => router.push('/')} className="w-full flex items-center justify-between gap-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-full px-4 py-2.5 text-gray-200 transition-all shadow-sm group mb-6 cursor-pointer">
          <span className="text-sm font-medium">New Thread</span>
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50 group-hover:bg-brand/20 group-hover:text-brand transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-shrink-0">
        <Link href="/" className={cn("flex items-center gap-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 transition-colors cursor-pointer font-medium text-sm", isCollapsed ? "justify-center p-3" : "px-3 py-2")}>
          <Search className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Discover</span>}
        </Link>
        <a href="#" className={cn("flex items-center gap-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 transition-colors cursor-pointer font-medium text-sm", isCollapsed ? "justify-center p-3" : "px-3 py-2")}>
          <Library className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Library</span>}
        </a>
      </nav>

      {/* Past Threads */}
      <div className="flex-1 overflow-y-auto mt-4 scrollbar-hide flex flex-col gap-1">
        {!isCollapsed && (pastChats.length > 0 || isSyncing) && (
          <div className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <span>Recent Threads</span>
            {isSyncing && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
        )}
        
        {pastChats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className={cn(
              "flex items-center gap-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 transition-colors cursor-pointer text-sm group",
              isCollapsed ? "justify-center p-3" : "px-3 py-2.5",
              pathname === `/chat/${chat.id}` && "bg-gray-800/60 text-gray-200"
            )}
            title={chat.title || "New Chat"}
            onClick={(e) => {
              if (editingChatId === chat.id) e.preventDefault();
            }}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                {editingChatId === chat.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleRenameSubmit(chat.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    autoFocus
                    className="flex-1 bg-gray-900 border border-brand/50 text-white rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50 min-w-0"
                  />
                ) : (
                  <span className="truncate flex-1 font-medium group-hover:text-white transition-colors">
                    {chat.title || "New Chat"}
                  </span>
                )}
                
                {editingChatId !== chat.id && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                    <button 
                      onClick={(e) => handleRenameStart(e, chat)}
                      className="p-1 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="p-1 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Auth / User Area */}
      <div className="mt-auto flex flex-col gap-2">
        {isLoaded && !isSignedIn ? (
          <div className="flex flex-col gap-2">
            <SignInButton mode="modal">
              <button className={cn("text-sm font-medium transition-colors text-center cursor-pointer", isCollapsed ? "p-3 rounded-xl bg-gray-800 hover:bg-gray-700" : "w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300")}>
                {isCollapsed ? <Sparkles className="w-5 h-5" /> : "Sign In"}
              </button>
            </SignInButton>
          </div>
        ) : isLoaded && isSignedIn ? (
          <div 
            onClick={() => openUserProfile()}
            className={cn("flex items-center hover:bg-gray-800/40 transition-colors cursor-pointer group", isCollapsed ? "justify-center p-2 rounded-full" : "justify-between px-3 py-2.5 rounded-xl")}
          >
            <div className="flex items-center gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <UserButton />
              </div>
              {!isCollapsed && <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors truncate">My Account</span>}
            </div>
            {!isCollapsed && <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
