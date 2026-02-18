import { useQuery } from '@tanstack/react-query'
import { MemberListItem, CustomFieldDefinition } from '@/types/member'

interface AllMembersResponse {
    members: MemberListItem[]
    customFields: CustomFieldDefinition[]
}

/**
 * Fetches ALL members for a location (excluding archived)
 * Results are cached for 5 minutes
 * Used by useMemberTabs for client-side filtering
 */
export function useAllLocationMembers(locationId: string) {
    return useQuery<AllMembersResponse>({
        queryKey: ['allLocationMembers', locationId],
        queryFn: async () => {
            const response = await fetch(`/api/protected/loc/${locationId}/members/all`)
            if (!response.ok) {
                throw new Error('Failed to fetch members')
            }
            return response.json()
        },
        enabled: !!locationId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false,
    })
}
