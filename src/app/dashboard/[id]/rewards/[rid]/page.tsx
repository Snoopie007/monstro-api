'use client';
import { use } from "react";

import { Skeleton, Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArchiveConfirmation } from "@/components/ui/archive-confirmation";
import { deleteReward } from "@/libs/api";
import { toast } from "react-toastify";
import { useReward } from "@/hooks/use-rewards";
import { UpsertReward } from "../components";
import Image from "next/image";

const CardButtons =
    "flex bg-transparent text-black-100 rounded-none border-l border-gray-200 flex-row items-center gap-2 hover:bg-black-100 hover:text-white h-10 px-4 py-2";
export default function RewardDetails(props: { params: Promise<{ id: string, rid: number }> }) {
    const params = use(props.params);
    const { reward, isLoading, error } = useReward(params.id, params.rid);
    const { push } = useRouter();

    const removeReward = async () => {
        await deleteReward(params.rid, params.id);
        toast.success("Reward Updated");
        push(`/dashboard/${params.id}/rewards`);
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl flex flex-col gap-2 m-auto mt-4">
                <Skeleton className="w-full  h-10   rounded-sm" />
                <Skeleton className="w-full  h-10   rounded-sm" />
                <Skeleton className="w-full  h-10   rounded-sm" />
            </div>
        );
    }
    if (!isLoading && !reward) {
        return (
            <div className="flex text-black-100 font-semibold font-roboto justify-center items-center bg-transparent border border-gray-100 rounded-sm p-3 px-5 mb-5 mt-4">
                Uh oh! No Reward found.
            </div>
        );
    }
    return (
        <div className="m-auto max-w-4xl mt-4">
            <div className=" mb-4 w-full border overflow-hidden border-gray-200 rounded-md">
                <div className="border-b flex flex-row justify-between border-gray-200">
                    <div className="flex-initial flex flex-row items-center px-4">
                        <button
                            onClick={() => {
                                push(`/dashboard/${params.id}/rewards`);
                            }}
                            className="group"
                        >
                            <ArrowLeft
                                size={18}
                                className="stroke-gray-300 group-hover:stroke-black-100"
                            />
                        </button>
                    </div>
                    <div className="flex-1 flex flex-row items-center justify-end ">
                        <div className="flex ">
                            <UpsertReward reward={reward} locationId={params.id} />
                            <ArchiveConfirmation
                                entity="reward"
                                params={{}}
                                removeFunction={removeReward}
                                buttonType="button"
                                buttonClassName={CardButtons}
                                openButtonText={"Archive"}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex flex-row gap-4 items-center w-full py-5 px-3">

                        <Avatar className=" max-w-full flex mr-4 items-center justify-center text-black-100 w-20 h-20 bg-gray-200 rounded-full">
                            <AvatarImage
                                className="w-full h-full rounded-full border"
                                src={reward.icon as string}
                            />
                            <AvatarFallback className=" group-hover:bg-violet-700 bg-gray-200 text-gray-400 text-5xl font-bold">
                                {reward?.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="">
                            <div>
                                <h4 className="flex-initial inline-block text-3xl font-poppins px-5  font-bold text-black-100  capitalize ">
                                    {reward?.name}
                                </h4>

                                <p className="font-normal text-base text-gray-600 font-roboto">
                                    {reward?.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`grid ${reward?.requiredPoints ? 'grid-cols-5' : 'grid-cols-4'} mb-4 border border-gray-200 w-full rounded-md`}>
                {reward?.requiredPoints &&
                    <div className="text-center p-4 border-r border-r-gray-200">
                        <span className="text-1xl font-bold font-poppins text-black-100">
                            Required Points
                        </span>
                        <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                            {reward?.requiredPoints}
                        </p>
                    </div>
                }
                {reward?.achievement ? (
                    <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Achievement
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {reward?.achievement?.name}
                    </p>
                </div>
                ) : (
                    <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Achievement
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        No Achievement
                    </p>
                </div>
                )}
                <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Gallery
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {reward?.images.map((url: string) => (
                            <div key={url} className='h-[80px] relative w-[80px]' >
                                <Image src={url} alt="reward gallery" className='object-contain' fill unoptimized />
                            </div>
                        ))}
                    </p>
                </div>
                <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Limit Per member
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {reward?.limitPerMember}
                    </p>
                </div>

            </div>
        </div >
    );
}
