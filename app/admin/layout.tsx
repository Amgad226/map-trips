import { getCurrentUser } from "@/lib/auth/session";
import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-30 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-lg font-bold text-foreground">
                Admin Dashboard
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/participants"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Participants
                </Link>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Map
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">{user.name}</span>
                  <LogoutButton />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
