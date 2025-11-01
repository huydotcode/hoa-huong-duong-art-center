export default function ClassesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This root layout is intentionally minimal so detail routes don't inherit list header/search
  return <>{children}</>;
}
