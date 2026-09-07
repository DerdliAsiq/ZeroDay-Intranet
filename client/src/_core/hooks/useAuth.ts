import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user as never);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await loginMutation.mutateAsync({ email, password });
      await utils.auth.me.invalidate();
      return user;
    },
    [loginMutation, utils]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  return {
    user: (meQuery.data ?? null) as { id: number; email: string | null; name: string | null; role: string } | null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: (meQuery.error ?? logoutMutation.error ?? loginMutation.error ?? null) as unknown as Error | null,
    loginError: loginMutation.error ?? null,
    loggingIn: loginMutation.isPending,
    isAuthenticated: Boolean(meQuery.data),
    login,
    logout,
    refresh: () => meQuery.refetch(),
  };
}
