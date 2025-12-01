import { useQuery } from "@tanstack/react-query";
import { GroupPost } from "@/types/groups";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const useCommunityPosts = ({ id, gid }: { id: string, gid: string }) => {
    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['communityPosts', id, gid],
        queryFn: () => fetcher(`/api/protected/loc/${id}/groups/${gid}/posts`),
    });

    // Posts are already sorted server-side by pinned (desc) and created (desc)
    const posts: GroupPost[] = data?.posts ?? [];

    return { posts, error, isLoading, refetch };
}
