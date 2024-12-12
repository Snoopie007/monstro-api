import { Program } from "@/types";
import PlanBuilder from "./components/plan-builder";
import { getRegister } from '@/libs/api';
import { RegistrationHeader } from "../components";
import { decodeId } from "@/libs/server-utils";

async function fetchPlans(locationId: string): Promise<Program[]> {
    try {
        // We should make one pull that pulls program with innerjoin of plan;
        const id = decodeId(locationId)
        console.log(id)
        const res = await getRegister({ url: `/vendor/register/get-programs-by-location/${id}` });
        console.log(res)
        return res.programs;
    } catch (error) {
        console.log("error", error);
        return [];
    }
}


export default async function ClubRegistration(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const {
        id
    } = params;

    const programs = await fetchPlans(id);


    return (
        <div className="flex  w-svw h-svh  flex-col items-center justify-start">
            <RegistrationHeader >
                Select a Program & Plan
            </RegistrationHeader>
            {!programs || programs.length === 0 ? (
                <div className="w-full text-black  my-10 rounded-sm max-w-md  p-4 text-center ">
                    <h1 className="font-semibold text-xl mb-2">   Uh oh, no programs were found!</h1>
                    <p>Please contact the program provider and to resolve this issue. </p>
                </div>
            ) : (
                <div className=" text-black max-w-4xl w-full  pt-6 pb-10 ">
                    <div className="mb-10">

                        <p className="text-center mt-2 text-base text-gray-800">Take your time and select a program and plan that fits your need below.</p>
                    </div>
                    <PlanBuilder programs={programs} locationId={id} />
                </div>
            )}
        </div>
    );
}
