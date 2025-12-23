import AuthenticationChangeProvider from "../_providers/AuthenticationChangeProvider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
    >
      <AuthenticationChangeProvider>{children}</AuthenticationChangeProvider>
    </div>
  );
}
