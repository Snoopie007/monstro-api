'use client'

import { useQuery } from '@tanstack/react-query'
import { MigrateMember } from '@/types/member'

interface UseMigrationsParams {
    locationId: string
    page?: number
    size?: number
    enabled?: boolean
}

export type MigrationsResponse = {
    migrations: MigrateMember[]
    count: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useMigrations({
    locationId,
    page = 0,
    size = 15,
    enabled = true,
}: UseMigrationsParams) {
    const queryParams = new URLSearchParams({
        page: String(page + 1),
        size: String(size),
    })

    const { data, error, isLoading, isFetching, refetch } = useQuery<MigrationsResponse>({
        queryKey: ['migrations', locationId, page, size],
        queryFn: () => fetcher(`/api/protected/loc/${locationId}/migrations?${queryParams}`),
        enabled: !!locationId && enabled,
        placeholderData: (previousData) => previousData,
        staleTime: 0,
    })

    return {
        migrations: data?.migrations ?? [],
        count: data?.count ?? 0,
        error,
        isLoading,
        isFetching,
        refetch,
    }
}
