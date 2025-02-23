
import React from 'react'
import { auth } from "@/auth";
import { StepBox, StepBoxContent, StepBoxHeader } from "./components";
import AddLocation from './components/AddLocation/AddLocation';
import { redirect } from 'next/navigation';
export default async function VendorOnboarding() {
    const session = await auth();

    if (session?.user.locations.length > 0) {
        const pendingLocation = session?.user.locations.find((location: { id: string, status: string }) => location.status === "Pending")
        if (pendingLocation) {
            return redirect(`/onboarding/${pendingLocation.id}`)
        }
    }

    return (
        <div className="space-y-4">

            <StepBox active={true}>
                <StepBoxHeader
                    title={"Create your business profile"}
                    description={"Find your business on Google or manually add your business information below."}
                />
                <StepBoxContent>
                    <AddLocation />
                </StepBoxContent>
            </StepBox>
        </div>
    );
}


