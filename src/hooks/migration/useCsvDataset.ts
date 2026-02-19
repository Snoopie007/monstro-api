import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import Papa from 'papaparse'
import { inferFieldType, type NewCustomField } from '@/types/migration'

type UseCsvDatasetResult = {
    file: File | undefined
    headers: string[]
    originalRows: Record<string, string>[]
    rows: Record<string, string>[]
    previewRows: Record<string, string>[]
    setRows: Dispatch<SetStateAction<Record<string, string>[]>>
    setPreviewRows: Dispatch<SetStateAction<Record<string, string>[]>>
    onFileChange: (nextFile: File | undefined) => void
    reset: () => void
    deriveNewCustomFields: (mappedColumns: Set<string>) => NewCustomField[]
}

export function useCsvDataset(): UseCsvDatasetResult {
    const [file, setFile] = useState<File | undefined>(undefined)
    const [headers, setHeaders] = useState<string[]>([])
    const [originalRows, setOriginalRows] = useState<Record<string, string>[]>([])
    const [rows, setRows] = useState<Record<string, string>[]>([])
    const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])

    const reset = useCallback(() => {
        setFile(undefined)
        setHeaders([])
        setOriginalRows([])
        setRows([])
        setPreviewRows([])
    }, [])

    const onFileChange = useCallback((nextFile: File | undefined) => {
        setFile(nextFile)

        if (!nextFile) {
            setHeaders([])
            setOriginalRows([])
            setRows([])
            setPreviewRows([])
            return
        }

        Papa.parse(nextFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedHeaders = (results.meta.fields || []).filter(h => h)
                const parsedRows = results.data as Record<string, string>[]

                setHeaders(parsedHeaders)
                setOriginalRows(parsedRows)
                setRows(parsedRows)
                setPreviewRows(parsedRows.slice(0, 10))
            },
            error: (error) => {
                console.error('CSV parsing error:', error)
            },
        })
    }, [])

    const deriveNewCustomFields = useCallback((mappedColumns: Set<string>) => {
        const unmappedHeaders = headers.filter(h => !mappedColumns.has(h))

        return unmappedHeaders.map(header => {
            const columnValues = rows.slice(0, 20).map(row => row[header])
            return {
                csvColumn: header,
                fieldName: header.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                fieldType: inferFieldType(columnValues),
                selected: false,
                sampleValues: columnValues.filter(v => v?.trim()).slice(0, 3),
            }
        })
    }, [headers, rows])

    return {
        file,
        headers,
        originalRows,
        rows,
        previewRows,
        setRows,
        setPreviewRows,
        onFileChange,
        reset,
        deriveNewCustomFields,
    }
}
