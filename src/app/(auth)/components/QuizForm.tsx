"use client";
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
    RadioGroup, RadioGroupItem
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/utils";
import { Industries } from "@/libs/data";
import { useRouter } from 'next/navigation';
import { signIn } from '@/hooks/useSession'
import { useJoin } from '../providers/JoinProvider';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

const MemberCount = [
    'less than 50',
    '50-100',
    '100-200',
    '200-300',
    '300-500',
    'more than 500',
]

const Years = [
    'less than 1 year',
    '1-3 years',
    '3-5 years',
    '5-10 years',
    'more than 10 years',
]

const Channels = [
    'Google',
    'Facebook',
    'Instagram',
    'YouTube',
    'Referral',
    'Other',
]

// Form schema
const QuizSchema = z.object({
    members: z.string().min(1, "Please select one"),
    niche: z.string().min(1, "Please select your niche"),
    years: z.string().min(1, "Please select one")
});

type QuizFormData = z.infer<typeof QuizSchema>;


const questions = [
    {
        step: 1,
        title: "Tell us how you plan to use Monstro?",
        fieldName: "members" as keyof QuizFormData,
        options: MemberCount,
    },
    {
        step: 2,
        title: "What kind of group classes do you offer?",
        fieldName: "niche" as keyof QuizFormData,
        options: Industries,
    },
    {
        step: 3,
        title: "How long have you been in business?",
        fieldName: "years" as keyof QuizFormData,
        options: Years,
    },
    {
        step: 4,
        title: "How did you hear about Monstro-X?",
        fieldName: "channels" as keyof QuizFormData,
        options: Channels,
    }
];

export function QuizForm() {
    const [step, setStep] = useState(1);
    const { user } = useJoin();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const form = useForm<QuizFormData>({
        resolver: zodResolver(QuizSchema),
        defaultValues: {
            members: "",
            niche: "",
            years: ""
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof QuizSchema>) {
        try {
            setLoading(true);
            const res = await signIn("credentials", {
                email: user?.email || "",
                password: user?.password || "",
                skipVerification: true,
            })
            if (res?.ok) {
                router.push('/dashboard/locations/new');
            }
        } catch (error: unknown) {
            toast.error((error as Error).message || "Error signing in");
        } finally {
            setLoading(false);
        }
    }

    const handleNext = () => {
        setStep(step + 1);
    };

    const currentQuestion = questions.find(q => q.step === step);
    const currentFieldValue = form.watch(currentQuestion?.fieldName || "members");
    const isCurrentStepValid = currentFieldValue && currentFieldValue.length > 0;

    return (
        <div className={cn("w-full ", { "hidden": !user })}>
            <Form {...form}>
                <form className="space-y-8">
                    {questions.map((question) => (
                        <fieldset key={question.step} className={cn("hidden space-y-4", (step === question.step && "block"))}>
                            <div className={cn('text-lg font-bold', question.step === 3 && "mb-12")}>
                                {question.title}
                            </div>
                            <FormField
                                control={form.control}
                                name={question.fieldName}
                                render={({ field }) => (
                                    <FormItem className="">
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                value={field.value}
                                                className={cn("flex flex-row flex-wrap gap-4")}
                                            >
                                                {question.options.map((option, index) => (
                                                    <FormItem key={option + index}>
                                                        <FormLabel className={cn(" cursor-pointer flex flex-row hover:border-black border border-gray-200  rounded-lg  p-4")}>
                                                            <FormControl className="mr-3">
                                                                <RadioGroupItem value={option} className="border-gray-200 border-2" />
                                                            </FormControl>
                                                            <div className="text-left">
                                                                <span className="font-bold text-base block leading-none">{option}</span>
                                                            </div>
                                                        </FormLabel>
                                                    </FormItem>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex">
                                <Button
                                    type="button"
                                    size="lg"
                                    disabled={!isCurrentStepValid}
                                    onClick={
                                        question.step < 4 ? handleNext : form.handleSubmit(onSubmit)
                                    }

                                >
                                    {loading ? <Loader2 className="size-4 animate-spin" /> : question.step < 4 ? "Next" : "Let's go"}
                                </Button>
                            </div>
                        </fieldset>
                    ))}
                </form>
            </Form>
        </div>
    );
};

export default QuizForm;