"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Plus, Compass, Library, Settings, Sparkles, PanelLeftClose, PanelLeftOpen, Search, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { isSignedIn, isLoaded } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "border-r border-gray-800/60 bg-[#111111] p-4 flex flex-col z-50 shadow-xl transition-all duration-300 ease-in-out h-full",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* Logo & Collapse Toggle */}
      <div className={cn("flex items-center mb-8 cursor-pointer group", isCollapsed ? "justify-center" : "justify-between px-2")}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              <BrainCircuit className="w-6 h-6 text-pink-500 drop-shadow-md" />
            </div>
            <h1 className="text-xl font-semibold text-gray-200 truncate">Answer Engine</h1>
          </div>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
        >
          {isCollapsed ? (
            <div className="w-8 h-8 flex items-center justify-center"><PanelLeftOpen className="w-5 h-5" /></div>
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* New Thread Button */}
      {isCollapsed ? (
        <button className="w-full flex justify-center p-3 mb-6 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-200 transition-all cursor-pointer">
          <Plus className="w-5 h-5" />
        </button>
      ) : (
        <button className="w-full flex items-center justify-between gap-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-full px-4 py-2.5 text-gray-200 transition-all shadow-sm group mb-6 cursor-pointer">
          <span className="text-sm font-medium">New Thread</span>
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/50 group-hover:bg-brand/20 group-hover:text-brand transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        <a href="#" className={cn("flex items-center gap-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 transition-colors cursor-pointer font-medium text-sm", isCollapsed ? "justify-center p-3" : "px-3 py-2")}>
          <Search className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Discover</span>}
        </a>
        <a href="#" className={cn("flex items-center gap-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 transition-colors cursor-pointer font-medium text-sm", isCollapsed ? "justify-center p-3" : "px-3 py-2")}>
          <Library className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Library</span>}
        </a>
      </nav>

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
          <div className={cn("flex items-center hover:bg-gray-800/40 transition-colors cursor-pointer group", isCollapsed ? "justify-center p-2 rounded-full" : "justify-between px-3 py-2.5 rounded-xl")}>
            <div className="flex items-center gap-3">
              <UserButton />
              {!isCollapsed && <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors truncate">My Account</span>}
            </div>
            {!isCollapsed && <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
