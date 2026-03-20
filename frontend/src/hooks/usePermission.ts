'use client';

import { useMemo } from 'react';
import { getUser, hasPermission, hasAnyPermission } from '@/lib/auth';

export function usePermission(permission: string): boolean {
  const user = useMemo(() => getUser(), []);
  return useMemo(() => hasPermission(user, permission), [user, permission]);
}

export function useAnyPermission(permissions: string[]): boolean {
  const user = useMemo(() => getUser(), []);
  return useMemo(() => hasAnyPermission(user, permissions), [user, permissions]);
}

export function useUser() {
  return useMemo(() => getUser(), []);
}
