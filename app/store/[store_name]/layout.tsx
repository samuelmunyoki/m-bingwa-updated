import type { Metadata } from "next";
import "../../globals.css";
import localFont from "next/font/local";
const futuraFont = localFont({
  src: "../../../public/fonts/Futura Book font.ttf",
});

export const metadata: Metadata = {
  title: "M-Bingwa Sokoni Merchants.",
  description:
    "Automate your Bingwa customers subscriptions. Fast - Easy - Ready to use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${futuraFont.className} antialiased h-screen w-screen overflow-hidden flex flex-col align-center bg-gray-100/30`}
    >
      {children}
    </div>
  );
}
