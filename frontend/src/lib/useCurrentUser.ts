import { useQuery } from '@tanstack/react-query';
import api from './api';
import { getCurrentUserFromToken, isStudent, isTeacher, canManage, AuthUser } from './auth';

export function useCurrentUser() {
  const cached = typeof window !== 'undefined' ? getCurrentUserFromToken() : null;

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth-me-user'],
    queryFn: async () => {
      try {
        const resp = await api.get('/api/auth/me');
        return (resp.data?.user || null) as AuthUser | null;
      } catch {
        return null;
      }
    },
    initialData: cached
      ? {
          id: cached.sub,
          name: cached.name,
          role: cached.role,
          phone: '',
          email: null,
          avatar: null,
          status: 10,
          center_id: null,
        }
      : undefined,
    staleTime: 60 * 1000,
  });

  const role = user?.role || cached?.role || '';
  const isUserStudent = isStudent(role);
  const isUserTeacher = isTeacher(role);
  const isUserManager = canManage(role);

  return {
    user: user || (cached ? { id: cached.sub, name: cached.name, role: cached.role } : null),
    role,
    isStudent: isUserStudent,
    isTeacher: isUserTeacher,
    isManager: isUserManager,
    isLoading: isLoading && !cached,
  };
}
