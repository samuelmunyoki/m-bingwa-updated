import type { Metadata } from "next";
import HelpMain from "@/app/_components/help/HelpMain";

export const metadata: Metadata = {
  title: "Help & Support — M-Bingwa",
  description:
    "Guides, tips, and answers to help you get the most out of M-Bingwa.",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh]">
        <HelpMain userId="" isAdmin={false} />
      </div>
    </div>
  );
}
