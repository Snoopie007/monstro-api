import { MemberStatus, TableState } from '@/types/member'

interface NameGeneratorParams {
    statusFilter: MemberStatus[]
    selectedTags: string[]
    searchQuery: string
    columnFilters: TableState['columnFilters']
}

export function generateTabName(params: NameGeneratorParams): string {
    const parts: string[] = []

    if (params.statusFilter.length === 1) {
        parts.push(capitalize(params.statusFilter[0]))
    } else if (params.statusFilter.length > 1) {
        parts.push('Custom Status')
    }

    if (params.selectedTags.length > 0) {
        const tagPreview = params.selectedTags.length <= 2
            ? params.selectedTags.join(' + ')
            : `${params.selectedTags.length} tags`
        parts.push(tagPreview)
    }

    if (params.searchQuery?.trim()) {
        parts.push(`"${params.searchQuery.trim().slice(0, 15)}"`)
    }

    params.columnFilters.forEach(f => {
        if (f.id !== 'status') {
            parts.push(`${f.id}: ${String(f.value).slice(0, 10)}`)
        }
    })

    if (parts.length === 0) return 'Custom'
    return parts.slice(0, 2).join(' - ')
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}
