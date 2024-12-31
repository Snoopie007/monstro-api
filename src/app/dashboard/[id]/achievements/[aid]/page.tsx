'use client';
import { use } from "react";

import { Skeleton, Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArchiveConfirmation } from "@/components/ui/archive-confirmation";
import { useAchievement } from "@/hooks/use-achievements";
import { UpsertAchivement } from "../components";
import { deleteAchievement } from "@/libs/api";
import { toast } from "react-toastify";

const CardButtons =
    "flex bg-transparent text-black-100 rounded-none border-l border-gray-200 flex-row items-center gap-2 hover:bg-black-100 hover:text-white h-10 px-4 py-2";
export default function AchievementDetails(props: { params: Promise<{ id: string, aid: number }> }) {
    const params = use(props.params);
    const { achievement, isLoading, error } = useAchievement(params.id, params.aid);
    const { push } = useRouter();

    const removeAchievement = async () => {
        await deleteAchievement(params.aid, params.id);
        toast.success("Achievement Updated");
        push(`/dashboard/${params.id}/achievements`);
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
    if (!isLoading && !achievement) {
        return (
            <div className="flex text-black-100 font-semibold font-roboto justify-center items-center bg-transparent border border-gray-100 rounded-sm p-3 px-5 mb-5 mt-4">
                Uh oh! No Achievement found.
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
                                push(`/dashboard/${params.id}/achievements`);
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
                            <UpsertAchivement achievement={achievement} locationId={params.id} />
                            <ArchiveConfirmation
                                entity="achievement"
                                params={{}}
                                removeFunction={removeAchievement}
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
                                src={achievement.image as string}
                            />
                            <AvatarFallback className=" group-hover:bg-violet-700 bg-gray-200 text-gray-400 text-5xl font-bold">
                                {achievement?.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="">
                            <div>
                                <h4 className="flex-initial inline-block text-3xl font-poppins px-5  font-bold text-black-100  capitalize ">
                                    {achievement?.name}
                                </h4>

                                <p className="font-normal text-base text-gray-600 font-roboto">
                                    {achievement?.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`grid ${achievement?.points ? 'grid-cols-5' : 'grid-cols-4'} mb-4 border border-gray-200 w-full rounded-md`}>
                {achievement?.badge &&
                    <div className="text-center p-4 border-r border-r-gray-200">
                        <span className="text-1xl font-bold font-poppins text-black-100">
                            Badge
                        </span>
                        <p className=" text-gray-700 text-sm font-semibold mt-2 font-roboto">
                            {achievement?.badge}
                        </p>
                    </div>
                }
                {achievement?.points &&
                    <div className="text-center p-4 border-r border-r-gray-200">
                        <span className="text-1xl font-bold font-poppins text-black-100">
                            Points
                        </span>
                        <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                            {achievement?.points}
                        </p>
                    </div>
                }
                {achievement?.program ? (
                    <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Program Name
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {achievement?.programName}
                    </p>
                </div>
                ) : (
                    <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Program
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        No Program
                    </p>
                </div>
                )}

                <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Action
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {achievement?.action[0].name}
                    </p>
                </div>
                <div className="text-center p-4 border-r border-r-gray-200">
                    <span className="text-1xl font-bold font-poppins text-black-100">
                        Action Count
                    </span>
                    <p className="text-gray-700 text-sm font-semibold mt-2 font-roboto">
                        {achievement?.action[0].pivot?.count}
                    </p>
                </div>

            </div>
        </div >
    );
}
