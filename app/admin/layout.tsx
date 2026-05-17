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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-lg font-bold text-gray-900">
                Admin Dashboard
              </Link>
              <Link
                href="/admin/trips/new"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + New Trip
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-600">{user.name}</span>
              )}
              <LogoutButton />
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
