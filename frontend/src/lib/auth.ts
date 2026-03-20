import Cookies from 'js-cookie';
import { User } from '@/types';

export function getUser(): User | null {
  const raw = Cookies.get('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveUser(user: User) {
  Cookies.set('user', JSON.stringify(user), { secure: true, sameSite: 'Strict' });
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

// Map of admin routes → required permission codename
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/products': 'products.view',
  '/admin/products/import': 'products.import',
  '/admin/purchases': 'purchases.view',
  '/admin/purchases/new': 'purchases.create',
  '/admin/suppliers': 'suppliers.view',
  '/admin/employees': 'employees.view',
  '/admin/expenses': 'expenses.view',
  '/admin/inventory': 'inventory.view',
};
