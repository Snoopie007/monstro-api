'use client'

import { motion } from 'framer-motion'
import StepBox, { StepBoxHeader, StepBoxContent } from './StepBox'
import AddLocation from './AddLocation/AddLocation'
import { useOnboarding } from '../provider/OnboardingProvider'
import { SelectPlan } from './ProgramSelection'
import VendorPayment from './VendorPayment/VendorPayment'



export function VendorPlanBuilder() {
    const { progress } = useOnboarding()


    const steps = [
        {
            step: 1,
            title: "Create your business profile",
            description: "Find your business on Google or manually add your business information below.",
            content: <AddLocation />
        },

        {
            step: 2,
            title: "Pick a plan that aligns with your needs",
            description: "Choose a plan that best suits your business needs and budget.",
            content: <SelectPlan />
        },

        {
            step: 3,
            title: "Make your payment",
            description: "Make your payment to complete the onboarding process.",
            content: <VendorPayment />
        }
    ]


    const visibleSteps = steps.filter(({ step }) => step === 1 || progress.completedSteps.includes(step - 1))

    return (
        <div className="space-y-4">

            {visibleSteps.map(({ step, title, description, content }) => (
                <StepBox key={step} active={progress.currentStep === step} completed={progress.completedSteps.includes(step)}>
                    <StepBoxHeader
                        title={title}
                        description={description}
                    />
                    <StepBoxContent>
                        <AnimatedSection>{content}</AnimatedSection>
                    </StepBoxContent>
                </StepBox>
            ))}
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
