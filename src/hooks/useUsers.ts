import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiUser, UserRole } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

/** All login users. Super-admin sees every user across hotels. */
export function useUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => await api.get<ApiUser[]>("/api/users"),
  });
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  /** Required for every role except super_admin; omit for super_admin. */
  hotel_id?: string | null;
}

/**
 * Create a login user from the admin dashboard. Super-admin only, enforced
 * server-side. This is the only way to create an owner account —
 * self-registration deliberately forbids the owner role.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return await api.post<{ user: ApiUser }>("/api/users", {
        full_name: input.full_name,
        email: input.email,
        password: input.password,
        role: input.role,
        ...(input.hotel_id ? { hotel_id: input.hotel_id } : {}),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "User created",
        description: `${variables.email} can now sign in as ${variables.role.replace(/_/g, " ")}.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not create user",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
}
