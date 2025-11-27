import { useQuery } from "@tanstack/react-query";
import { GroupPost } from "@/types/groups";
import { useMemo } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const useCommunityPosts = ({ id, gid }: { id: string, gid: string }) => {

    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['communityPosts', id, gid],
        queryFn: () => fetcher(`/api/protected/loc/${id}/groups/${gid}/posts`),
    });

    const posts = useMemo(() => {
        if (!data?.posts) return [];
        
        return [...data.posts].sort((a: GroupPost, b: GroupPost) => {
            // Sort by pinned status first (pinned at top)
            if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
            }
            // Then sort by creation date (newest first)
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });
    }, [data?.posts]);

    return { posts, error, isLoading, refetch };
}
