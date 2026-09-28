import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@kpi/contracts";
import { api, getApiActor, setApiActor } from "../lib/api";

interface ActorState { actorId: string; actor?: User; actors: User[]; switchActor: (id: string) => void }
const ActorContext = createContext<ActorState | null>(null);

export function ActorProvider({ children }: { children: ReactNode }) {
  const [actorId, setActorId] = useState(getApiActor());
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["actor-options"], queryFn: () => api<User[]>("/demo-actors"), staleTime: Infinity });
  const switchActor = (id: string) => { setApiActor(id); setActorId(id); void client.invalidateQueries(); };
  const actor = users.data?.find((user) => user.id === actorId);
  return <ActorContext.Provider value={{ actorId, actor, actors: users.data ?? [], switchActor }}>{children}</ActorContext.Provider>;
}

export const useActor = () => {
  const value = useContext(ActorContext);
  if (!value) throw new Error("ActorProvider is missing");
  return value;
};
