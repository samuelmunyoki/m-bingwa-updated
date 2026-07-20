import AuthenticationChangeProvider from "@/app/_providers/AuthenticationChangeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Mobile: min-height + vertical scroll so content isn't clipped; w-full + overflow-x-hidden avoids
  // the sideways scrollbar that w-screen causes. Desktop (md+): original fixed-viewport, no-scroll shell.
  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden overflow-y-auto md:h-screen md:w-screen md:overflow-hidden flex flex-col bg-gray-100/30`}
    >
      <AuthenticationChangeProvider>{children}</AuthenticationChangeProvider>
    </div>
  );
}
