import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "Answer Engine",
  description: "Built for speed and precision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen w-full antialiased">
        <ClerkProvider afterSignOutUrl="/">
          {/* The Sidebar (Server Component - Zero JavaScript sent to browser) */}
          <aside className="w-64 border-r border-gray-800 bg-[var(--color-sidebar)] p-4 hidden md:flex flex-col">
            <h1 className="text-xl font-bold text-brand mb-8">Engine</h1>
            <nav className="flex flex-col gap-4 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">New Search</a>
              <a href="#" className="hover:text-white transition-colors">Library</a>
            </nav>

            <div className="mt-auto pt-4 border-t border-gray-800 flex flex-col gap-3">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="w-full py-2 px-3 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors text-left cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full py-2 px-3 text-sm font-medium text-white bg-brand hover:opacity-90 rounded transition-colors text-left cursor-pointer">
                    Sign Up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center gap-3">
                  <UserButton />
                  <span className="text-sm text-gray-300 font-medium">My Account</span>
                </div>
              </Show>
            </div>
          </aside>

          {/* The Main Content Area */}
          <main className="flex-1 flex flex-col relative overflow-hidden">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}