import { auth } from "@/auth";
import { SupportCase } from "@/types/admin"
import MessageArea from "./components/MessageArea";
import { admindb } from "@/db/db";
import { format, formatDistance } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ExtendedUser } from "@/types/next-auth";

async function getCase(id: number): Promise<SupportCase | undefined> {
    try {
        const c = await admindb.query.supportCases.findFirst({
            where: (supportCases, { eq }) => eq(supportCases.id, id),
            with: {
                messages: true
            }
        })

        return c;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}


export default async function TicketPage(props: { params: Promise<{ cid: number }> }) {
    const params = await props.params;
    const session = await auth()

    const c = await getCase(params.cid);
    const user = session?.user as ExtendedUser;

    return (
        <div className="max-w-6xl w-full m-auto mt-12" >
            {c && (
                <section className='grid grid-cols-7 gap-10'>
                    <div className='col-span-5 space-y-4'>
                        <div className="space-y-1">
                            <h1 className='text-lg font-bold'>
                                {c.subject}
                            </h1>
                            <p className="text-sm text-muted-foreground flex flex-row gap-1">
                                <span>
                                    Last updated {format(new Date(c.updated!), 'MMM d, yyyy h:mm a')}
                                </span>
                                <span >·</span>
                                <span>
                                    Opened {formatDistance(c.created, new Date())} ago
                                </span>
                            </p>
                        </div>

                        <MessageArea c={c} user={user} />
                    </div>
                    <CaseInfo c={c} user={user} />
                </section>
            )}
            {!c && (
                <div className="flex flex-col items-center justify-center h-full">
                    <p>Sorry, the ticket you are looking for could not be found.</p>
                </div>
            )}

        </div>

    )
}


function CaseInfo({ c, user }: { c: SupportCase, user: ExtendedUser }) {
    return (
        <aside className='col-span-2 size-full  sticky top-20'>
            <div className="text-[0.8rem] text-muted-foreground space-y-4">
                <div>
                    <div>Case Number</div>
                    <span className="text-foreground font-medium">#{100 + +c.id}</span>
                </div>
                <div>
                    <div>Status</div>
                    <Badge size="tiny" variant="default" className="rounded-full capitalize">
                        {c.status}
                    </Badge>
                </div>
                <div>
                    <div>Severity</div>
                    <Badge size="tiny" severity={c.severity} className="rounded-full capitalize">
                        {c.severity}
                    </Badge>
                </div>
                <div>
                    <div>Opened by</div>
                    <span className="text-foreground font-medium">{user?.name}</span>
                </div>
            </div>
        </aside>
    )
}