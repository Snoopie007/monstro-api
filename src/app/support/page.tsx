import { SupportCategory } from "@/types/admin";
import { auth } from "@/auth";
import { DocSearch } from "./components/DocSearch";
import { admindb } from "@/db/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, Users, Mail, ScrollText, ChevronRight } from "lucide-react";
import { Footer } from "./components";

type SupportButton = {
    href: string;
    text: string;
    icon?: React.ReactNode;
    target?: string;
}

type SupportItem = {
    title: string;
    description: string;
    buttons: SupportButton[];
}

async function getSupportCategories(): Promise<SupportCategory[] | undefined> {
    try {
        const categories = await admindb.query.supportCategories.findMany({
            with: {
                metas: true
            }
        });

        return categories;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

const SupportItems: SupportItem[] = [
    {
        title: "Can't find what you're looking for?",
        description: "If you can't find what you're looking for, please contact us via email or create a case.",
        buttons: [
            {
                href: "mailto:support@monstro.com",
                icon: <Mail size={14} />,
                text: "Email Support"
            },
            {
                href: "/support/cases?redirect=" + encodeURIComponent('/support/cases'),
                icon: <ArrowUpRight size={14} />,
                text: "Create a Case"
            }
        ]
    },
    {
        title: "Ask the community",
        description: "Join our Facebook group to browse for help and best practices from other Monstro users.",
        buttons: [
            {
                href: "#",
                icon: <Users size={14} />,
                text: "Join Group",
                target: "_blank"
            }
        ]
    },
    {
        title: "Want to join Monstro?",
        description: "Have a question about Monstro? Contact our sales team to get all your questions answered.",
        buttons: [
            {
                href: "https://mymonstro.com/contact",
                text: "Contact Sales",
                target: "_blank"
            }
        ]
    }
]

export default async function SupportPage() {
    const categories = await getSupportCategories();
    return (
        <>
            <div className="min-h-screen  w-full  m-auto  p-2">
                <div className="bg-foreground/5 rounded-lg min-h-[300px] flex flex-col justify-center items-center ">

                    <div className="flex flex-col gap-2 max-w-6xl mx-auto text-center">
                        <span className="text-xs text-indigo-500  uppercase">Monstro Support</span>
                        <div className='flex flex-col gap-4'>
                            <h1 className="text-3xl font-medium">Hello, how can we help?</h1>
                            <DocSearch categories={categories} />
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-6xl grid grid-cols-3 gap-4 py-6">
                    {SupportItems.map((item, i) => (
                        <div key={i} className="col-span-1 bg-foreground/5 rounded-md p-6 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-base font-medium">{item.title}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {item.description}
                                </p>
                            </div>
                            <div className="flex flex-row gap-2">
                                {item.buttons.map((button, j) => (
                                    <Button key={j} variant="foreground" size="xs" className="w-fit" asChild>
                                        <Link
                                            href={button.href}
                                            target={button.target}
                                            className="flex flex-row gap-1 items-center"
                                        >
                                            {button.icon}
                                            <span>{button.text}</span>
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="max-w-6xl mx-auto text-left space-y-2 mb-10">
                    <h3 className="text-base font-medium">Browse by category</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {categories?.map((category, i) => (
                            <div key={i} className="col-span-1 bg-foreground/5 rounded-md px-4 py-3 flex flex-row gap-3">
                                <div className="flex flex-col gap-1 flex-1">
                                    <h2 className="text-sm font-medium">{category.name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {category.description}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="size-6 rounded-md" asChild>
                                    <Link href={`/support/category/${category.name.toLowerCase()}`}>
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div >
            <Footer />
        </>
    )
}