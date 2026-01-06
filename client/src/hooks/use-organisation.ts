import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface OrganisationMembership {
  id: string;
  userId: string;
  role: "admin" | "staff";
  joinedAt: string;
  organisation: {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: string;
    displayName?: string | null;
    logoStoragePath?: string | null;
    accentColor?: string | null;
  };
}

async function fetchMembership(): Promise<OrganisationMembership | null> {
  const response = await fetch("/api/me/organisation", {
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useOrganisation() {
  const queryClient = useQueryClient();
  
  const { data: membership, isLoading, error } = useQuery<OrganisationMembership | null>({
    queryKey: ["/api/me/organisation"],
    queryFn: fetchMembership,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", "/api/organisation", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/organisation"] });
    },
  });

  const joinOrgMutation = useMutation({
    mutationFn: async (data: { inviteCode: string }) => {
      return apiRequest("POST", "/api/organisation/join", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/organisation"] });
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/organisation/regenerate-code");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/organisation"] });
    },
  });

  return {
    membership,
    isLoading,
    error,
    hasOrganisation: !!membership,
    isAdmin: membership?.role === "admin",
    createOrg: createOrgMutation.mutateAsync,
    isCreatingOrg: createOrgMutation.isPending,
    createOrgError: createOrgMutation.error,
    joinOrg: joinOrgMutation.mutateAsync,
    isJoiningOrg: joinOrgMutation.isPending,
    joinOrgError: joinOrgMutation.error,
    regenerateCode: regenerateCodeMutation.mutateAsync,
    isRegeneratingCode: regenerateCodeMutation.isPending,
  };
}
