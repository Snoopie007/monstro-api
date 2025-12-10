import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactionCount } from "@/types/groups";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type EmojiData = {
    value: string;
    name: string;
    type: string;
};

type UseReactionsParams = {
    ownerType: "post" | "comment" | "message";
    ownerId: string;
    enabled?: boolean;
    initialData?: ReactionCount[];
};

export function useReactions({ ownerType, ownerId, enabled = true, initialData }: UseReactionsParams) {
    const queryClient = useQueryClient();
    const queryKey = ["reactions", ownerType, ownerId];

    // Fetch reactions - skip if initialData is provided
    const { data, error, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: () => fetcher(`/api/protected/reactions/${ownerType}/${ownerId}`),
        enabled: enabled && !!ownerId && !initialData,
        initialData: initialData ? { reactions: initialData } : undefined,
    });

    // Toggle reaction mutation - server handles add/remove logic
    const toggleMutation = useMutation({
        mutationFn: async (emoji: EmojiData) => {
            const response = await fetch(
                `/api/protected/reactions/${ownerType}/${ownerId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emoji }),
                }
            );
            if (!response.ok) throw new Error("Failed to toggle reaction");
            return response.json();
        },
        onSuccess: () => {
            // Refetch to get updated counts
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Toggle reaction - server handles determining add vs remove
    const toggleReaction = async (emoji: EmojiData) => {
        return toggleMutation.mutateAsync(emoji);
    };

    return {
        reactions: (data?.reactions ?? initialData ?? []) as ReactionCount[],
        error,
        isLoading,
        refetch,
        toggleReaction,
        isUpdating: toggleMutation.isPending,
    };
}
