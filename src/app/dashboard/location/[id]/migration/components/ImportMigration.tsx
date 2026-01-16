'use client'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogClose,
    ButtonGroup,
    Switch,
} from '@/components/ui'
import React, { useEffect, useState, useMemo } from 'react'
import Papa from 'papaparse'
import { FileDown, Loader2 } from 'lucide-react'
import { sleep, tryCatch, formatAmountForDisplay } from '@/libs/utils'
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
    Label,
} from '@/components/forms'
import { toast } from 'react-toastify'
import { useMemberPlans } from '@/hooks'
import Link from 'next/link'
import { MemberPlan, MemberPlanPricing } from '@/types'
import { ImportMemberForm, FieldMapping } from './'

const REQUIRED_FIELDS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'lastRenewalDate',
]

type FilePreviewType = {
    headers: string[]
    data: Record<string, string>[]
}

export function ImportMigration({ lid, onSuccess }: { lid: string; onSuccess?: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const [file, setFile] = useState<File | undefined>(undefined)
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
    const [pricingId, setPricingId] = useState<string | null>(null)
    const [preview, setPreview] = useState<FilePreviewType | null>(null)
    const [requirePayment, setRequirePayment] = useState(false)
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<string[]>([])
    const { plans } = useMemberPlans(lid)
    const [open, setOpen] = useState(false)

    // Derived state for selected plan and pricing options
    const selectedPlan = useMemo(() => {
        return plans?.find((p: MemberPlan) => p.id === selectedPlanId)
    }, [plans, selectedPlanId])

    const pricingOptions = selectedPlan?.pricingOptions || []

    // Reset pricing when plan changes
    useEffect(() => {
        setPricingId(null)
    }, [selectedPlanId])

    useEffect(() => {
        setErrors([])
        setPreview(null)
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            preview: 5,
            complete: (results) => {
                if (!results.meta.fields?.length || !results.data?.length) {
                    setErrors([
                        `Invalid CSV: No ${!results.meta.fields?.length ? 'headers' : 'data'
                        } found.`,
                    ])
                    return
                }

                const headers = (results.meta.fields as string[]).filter(
                    (h) => h.trim().length > 0 && !h.startsWith('_')
                )
                const data = results.data as Record<string, string>[]
                setPreview({ headers, data })
            },
        })
    }, [file])

    function handleOpenChange(open: boolean) {
        setOpen(open)
        setIsLoading(false)
        if (!open) {
            setFieldMapping({})
            setFile(undefined)
            setPreview(null)
        }
    }

    const isFormValid = () => {
        return (
            preview &&
            preview.data.length > 0 &&
            Object.keys(fieldMapping).length === REQUIRED_FIELDS.length
        )
    }

    async function handleUpload() {
        if (!preview || preview.data.length === 0) {
            toast.error('No valid data to upload.')
            return
        }

        // Check if all required fields are mapped
        const unmappedFields = REQUIRED_FIELDS.filter(
            (field) => !fieldMapping[field]
        )
        if (unmappedFields.length > 0) {
            setErrors((errors) => [
                ...errors,
                `Please map all required fields: ${unmappedFields.join(', ')}`,
            ])
            return
        }

        setIsLoading(true)
        const formData = new FormData()

        formData.append('file', file as File)
        formData.append('fieldMapping', JSON.stringify(fieldMapping))
        if (pricingId) {
            formData.append('pricingId', pricingId)
        }
        formData.append('requirePayment', requirePayment.toString())
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/import`, {
                method: 'POST',
                body: formData,
            })
        )

        if (error || !result || !result.ok) {
            const data = await result?.json()
            setIsLoading(false)
            toast.error(
                data?.message || 'Something went wrong, please try again later'
            )
            return
        }

        toast.success('Members migrated successfully')
        onSuccess?.()
        handleOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="primary" className='flex flex-row items-center gap-2'>
                    <FileDown className='size-4' />
                    <span>Import Members</span>
                </Button>

            </DialogTrigger>
            <DialogContent className="w-full max-w-lg md:rounded-lg p-0 gap-0 border-foreground/10">
                {isLoading ? (
                    <div className="flex items-center justify-center text-sm py-8 h-full gap-2">
                        <Loader2 className="size-4 animate-spin" /> Migrating
                        members
                        <span className="animate-pulse">...</span>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="space-y-1 px-4 pt-4 pb-0 group">
                            <DialogTitle className="text-base font-medium">
                                Import Migration
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Upload a CSV file. Ensure the date format is
                                YYYY-MM-DD. Download the{' '}
                                <Link
                                    href={`/api/protected/loc/${lid}/members/import/template`}
                                    target="_blank"
                                    className="text-red-500 font-medium hover:underline"
                                >
                                    CSV template
                                </Link>{' '}
                                to see the required headers. Any invalid email,
                                phone, or renewal date will be skipped.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-4  space-y-2">
                            <ImportMemberForm file={file} setFile={setFile} />
                            {errors.length > 0 && (
                                <div className="space-y-1">
                                    {errors.map((error, index) => (
                                        <p
                                            key={index}
                                            className="text-red-500 text-sm font-medium"
                                        >
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {file && preview && (
                                <div className="space-y-2">
                                    <FieldMapping
                                        headers={preview.headers}
                                        fieldMapping={fieldMapping}
                                        setFieldMapping={setFieldMapping}
                                    />
                                    <div className="space-y-1">
                                        <Label className="text-tiny uppercase font-medium">
                                            Select a Plan
                                        </Label>
                                        <Select
                                            value={selectedPlanId || ''}
                                            onValueChange={setSelectedPlanId}
                                        >
                                            <SelectTrigger className="border-foreground/10">
                                                <SelectValue placeholder="Select a Plan" />
                                            </SelectTrigger>
                                            <SelectContent className="border-foreground/10">
                                                {(plans || [])
                                                    .filter((p: MemberPlan) => p.id)
                                                    .map((p: MemberPlan) => (
                                                        <SelectItem
                                                            key={p.id}
                                                            value={p.id}
                                                        >
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedPlanId && pricingOptions.length > 0 && (
                                        <div className="space-y-1">
                                            <Label className="text-tiny uppercase font-medium">
                                                Select Pricing Option
                                            </Label>
                                            <Select
                                                value={pricingId || ''}
                                                onValueChange={setPricingId}
                                            >
                                                <SelectTrigger className="border-foreground/10">
                                                    <SelectValue placeholder="Select pricing" />
                                                </SelectTrigger>
                                                <SelectContent className="border-foreground/10">
                                                    {pricingOptions.map((pricing: MemberPlanPricing) => (
                                                        <SelectItem key={pricing.id} value={pricing.id}>
                                                            {pricing.name} - {formatAmountForDisplay(pricing.price / 100, pricing.currency || 'usd')}/{pricing.interval || "one-time"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <p className="text-xs text-yellow-400">
                                        If no plan is selected, members will be
                                        added without a program or plan. You can
                                        assign one later.
                                    </p>
                                </div>
                            )}
                            {file && preview && (
                                <>
                                    <div className="flex flex-row items-center gap-2">
                                        <Label className="text-tiny uppercase font-medium">
                                            Require Payment
                                        </Label>
                                        <Switch
                                            onCheckedChange={(checked) =>
                                                setRequirePayment(checked)
                                            }
                                            checked={requirePayment}
                                        />
                                    </div>
                                    <p className="text-xs text-yellow-400">
                                        If checked, members will be required to
                                        add a payment method right away when
                                        joining.
                                    </p>
                                </>
                            )}
                        </div>
                        <DialogFooter className="px-4 pb-4 pt-0 md:justify-between">
                            <DialogClose asChild>
                                <Button
                                    variant="clear"
                                    size="sm"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                variant="continue"
                                size="sm"
                                onClick={handleUpload}
                                disabled={!isFormValid() || isLoading}
                            >
                                Migrate
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

