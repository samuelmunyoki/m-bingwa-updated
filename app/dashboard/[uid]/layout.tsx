import AuthenticationChangeProvider from "@/app/_providers/AuthenticationChangeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col align-center bg-gray-100/30`}
    >
      <AuthenticationChangeProvider>{children}</AuthenticationChangeProvider>
    </div>
  );
}
