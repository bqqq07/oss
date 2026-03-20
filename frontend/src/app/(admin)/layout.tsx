import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import { User } from '@/types';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;

  if (!userCookie) {
    redirect('/login');
  }

  let user: User;
  try {
    user = JSON.parse(userCookie) as User;
  } catch {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar userPermissions={user.permissions} userName={user.full_name} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
