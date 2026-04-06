import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  Database,
  FileText,
  Home,
  Key,
  Settings2,
  Wallet,
} from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Claimly",
  description: "Home dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const sidebarItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Wallet, label: "Blank Page", href: "/finances" },
    { icon: Key, label: "Blank Page", href: "/mortgage" },
    { icon: FileText, label: "Blank Page", href: "/claims" },
    { icon: Database, label: "Blank Page", href: "/equipment" },
    { icon: Settings2, label: "Settings", href: "/settings" },
  ] as const;

  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className={`${inter.className} min-h-screen bg-[#F3F4F6] font-sans antialiased`}>
        <aside className="peer/sidebar group/sidebar fixed left-4 top-4 bottom-4 z-40 flex w-[64px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white px-4 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-[width] duration-300 ease-out hover:w-[196px]">
            <div className="mb-4 flex shrink-0 items-center gap-3 overflow-hidden">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FDE047] text-black"
                aria-label="Claimly logo"
              >
                <span className="text-sm font-semibold">C</span>
              </div>
              <span className="whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                Claimly
              </span>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-2" aria-label="Main navigation">
              {sidebarItems.map(({ icon: Icon, label, href }, index) => (
                <Link key={href} href={href} className="flex h-9 items-center gap-3 rounded-xl px-1">
                  <Icon
                    className={`h-5 w-5 shrink-0 stroke-[1.5] ${index === 0 ? "text-black" : "text-gray-400"}`}
                  />
                  <span className="whitespace-nowrap text-sm font-medium text-gray-600 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                    {label}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
              <span className="whitespace-nowrap text-sm font-medium text-gray-600 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                Profile
              </span>
            </div>
        </aside>

        <main className="relative z-50 ml-[100px] mr-8 mt-6 w-[calc(100%-132px)] max-w-[1200px] transition-[margin,width] duration-300 ease-out peer-hover/sidebar:ml-[232px] peer-hover/sidebar:w-[calc(100%-264px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
