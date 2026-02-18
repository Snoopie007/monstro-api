import { MemberListItem, MemberStatus, TableState } from '@/types/member'
import { ColumnFiltersState } from '@tanstack/react-table'

export function filterByStatus(
    members: MemberListItem[],
    statusFilter: MemberStatus[]
): MemberListItem[] {
    if (statusFilter.length === 0) return members
    return members.filter(m => statusFilter.includes(m.memberLocation.status as MemberStatus))
}

export function filterBySearch(
    members: MemberListItem[],
    query: string
): MemberListItem[] {
    if (!query?.trim()) return members
    const lowerQuery = query.trim().toLowerCase()
    const compactQuery = lowerQuery.replace(/\s+/g, '')

    return members.filter(m => {
        const firstName = m.firstName.toLowerCase()
        const lastName = (m.lastName ?? '').toLowerCase()
        const fullName = `${firstName} ${lastName}`.trim()

        return (
            firstName.includes(lowerQuery) ||
            lastName.includes(lowerQuery) ||
            fullName.includes(lowerQuery) ||
            `${firstName}${lastName}`.includes(compactQuery) ||
            m.email.toLowerCase().includes(lowerQuery) ||
            (m.phone ?? '').includes(query)
        )
    })
}

export function filterByTags(
    members: MemberListItem[],
    tagIds: string[],
    operator: 'AND' | 'OR'
): MemberListItem[] {
    if (tagIds.length === 0) return members

    return members.filter(member => {
        const memberTagIds = member.tags.map(t => t.id)
        if (operator === 'AND') {
            return tagIds.every(tagId => memberTagIds.includes(tagId))
        } else {
            return tagIds.some(tagId => memberTagIds.includes(tagId))
        }
    })
}

export function filterByColumnFilters(
    members: MemberListItem[],
    filters: ColumnFiltersState
): MemberListItem[] {
    if (filters.length === 0) return members

    return members.filter(member => {
        return filters.every(filter => {
            const value = String(filter.value).toLowerCase()
            if (!value) return true

            switch (filter.id) {
                case 'name':
                    return member.firstName.toLowerCase().includes(value) ||
                        (member.lastName?.toLowerCase().includes(value))
                case 'email':
                    return member.email.toLowerCase().includes(value)
                case 'phone':
                    return (member.phone ?? '').includes(value)
                case 'gender':
                    return member.gender?.toLowerCase() === value
                case 'status':
                    return member.memberLocation.status.toLowerCase() === value
                default:
                    if (filter.id.startsWith('custom-field-')) {
                        const fieldId = filter.id.replace('custom-field-', '')
                        const cf = member.customFields.find(f => f.fieldId === fieldId)
                        return cf?.value.toLowerCase().includes(value)
                    }
                    return true
            }
        })
    })
}

export function sortMembers(
    members: MemberListItem[],
    sorting: { id: string; direction: 'asc' | 'desc' }[]
): MemberListItem[] {
    if (sorting.length === 0) {
        return [...members].sort((a, b) =>
            new Date(b.created).getTime() - new Date(a.created).getTime()
        )
    }

    const { id, direction } = sorting[0]
    const multiplier = direction === 'asc' ? 1 : -1

    return [...members].sort((a, b) => {
        let aVal: string | number | Date, bVal: string | number | Date

        switch (id) {
            case 'firstName':
                aVal = a.firstName.toLowerCase()
                bVal = b.firstName.toLowerCase()
                break
            case 'lastName':
                aVal = (a.lastName || '').toLowerCase()
                bVal = (b.lastName || '').toLowerCase()
                break
            case 'email':
                aVal = a.email.toLowerCase()
                bVal = b.email.toLowerCase()
                break
            case 'created':
                aVal = new Date(a.created).getTime()
                bVal = new Date(b.created).getTime()
                break
            case 'updated':
                aVal = a.updated ? new Date(a.updated).getTime() : 0
                bVal = b.updated ? new Date(b.updated).getTime() : 0
                break
            case 'dob':
                aVal = a.dob ? new Date(a.dob).getTime() : 0
                bVal = b.dob ? new Date(b.dob).getTime() : 0
                break
            default:
                return 0
        }

        if (aVal < bVal) return -1 * multiplier
        if (aVal > bVal) return 1 * multiplier
        return 0
    })
}
