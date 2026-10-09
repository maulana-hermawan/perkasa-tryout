import { AppHeader } from "@/components/layout/app-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">{children}</main>
    </div>
  );
}
