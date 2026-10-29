import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "../store/auth";

export type Modules = { ia: boolean; documentos: boolean; slack: boolean };

export function useModules() {
  const user = useAuth((state) => state.user);
  const query = useQuery({
    queryKey: ["modules", user?.id],
    queryFn: () => api<Modules>("/modules"),
    enabled: !!user && !user.must_change_password,
    refetchInterval: 15000,
  });
  return query.data ?? user?.modules ?? { ia: false, documentos: false, slack: false };
}
