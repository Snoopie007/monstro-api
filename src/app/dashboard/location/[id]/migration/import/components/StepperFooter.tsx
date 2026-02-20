'use client'

import { RefObject } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IStepperMethods } from '@/components/ui/stepper'

interface StepperFooterProps {
    stepperRef: RefObject<(HTMLDivElement & IStepperMethods) | null>
    currentStep: number
    isStep1Valid: boolean | null | undefined
    isStep2Valid: boolean
    isImporting: boolean
}

export function StepperFooter({
    stepperRef,
    currentStep,
    isStep1Valid,
    isStep2Valid,
    isImporting,
}: StepperFooterProps) {
    const handleNext = () => {
        stepperRef.current?.nextStep()
    }

    const handleBack = () => {
        stepperRef.current?.prevStep()
    }

    const canGoNext = () => {
        if (currentStep === 1) return isStep1Valid
        if (currentStep === 2) return isStep2Valid
        return false
    }

    const showBackButton = currentStep > 1
    const showNextButton = currentStep < 3
    const isLastStep = currentStep === 3

    return (
        <div className='flex items-center justify-between pt-6 border-t border-foreground/10 mt-6'>
            <div>
                {showBackButton ? (
                    <Button
                        variant='ghost'
                        onClick={handleBack}
                        disabled={isImporting}
                        className='gap-2'
                    >
                        <ArrowLeft className='size-4' />
                        Back
                    </Button>
                ) : (
                    <div />
                )}
            </div>

            <div>
                {showNextButton ? (
                    <Button
                        variant='primary'
                        onClick={handleNext}
                        disabled={!canGoNext()}
                        className='gap-2'
                    >
                        Continue
                        <ArrowRight className='size-4' />
                    </Button>
                ) : null}

                {isLastStep ? (
                    <div className='text-sm text-muted-foreground'>
                        Use the button above to import
                    </div>
                ) : null}
            </div>
        </div>
    )
}
