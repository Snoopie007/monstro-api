'use client'

import { motion } from 'framer-motion'
import { useOnboarding } from '../provider/OnboardingProvider'
import { SelectPlan } from './ProgramSelection'
import VendorPayment from './VendorPayment/VendorPayment'
import { StepBox, StepBoxHeader, StepBoxContent } from '../../components'
import { useState } from 'react'

export function VendorPlanBuilder() {
    const { progress } = useOnboarding()
    const [currentStep, setCurrentStep] = useState(1)
    return (
        <div className="space-y-4">
            <StepBox active={currentStep === 1}>
                <StepBoxHeader
                    title="Pick a plan that aligns with your needs"
                    description="Choose a plan that best suits your business needs and budget."
                />
                <StepBoxContent>
                    <AnimatedSection>
                        <SelectPlan setCurrentStep={setCurrentStep} />
                    </AnimatedSection>
                </StepBoxContent>
            </StepBox>
            <StepBox active={currentStep === 2}>
                <StepBoxHeader
                    title="Make your payment"
                    description="Make your payment to complete the onboarding process."
                />
                <StepBoxContent>
                    <AnimatedSection>
                        <VendorPayment />
                    </AnimatedSection>
                </StepBoxContent>
            </StepBox>
        </div>
    )
}

function AnimatedSection({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
