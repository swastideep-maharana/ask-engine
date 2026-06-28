import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "./globals.css";
import { AuroraBackground } from "@/components/ui/aurora-background";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Answer Engine",
  description: "Built for speed and precision.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body className="flex h-screen w-full antialiased bg-[#0a0a0a]">
          <div className="hidden md:flex">
            <Sidebar />
          </div>

          {/* The Main Content Area */}
          <main className="flex-1 flex flex-col relative overflow-hidden">
            <AuroraBackground>
              {children}
            </AuroraBackground>
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}