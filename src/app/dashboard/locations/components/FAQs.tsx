import { Button } from "@/components/ui/button"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from 'lucide-react'

const faqs = [
    {
        q: "What makes Monstro-X different from other member management software?",
        a: "Unlike most membership software, Monstro-X combines powerful automation tools with built-in gamification, community features, and AI support—all designed to increase member engagement and retention. It's more than just tracking attendance or payments—it's a full engagement system."
    },
    {
        q: "How does the Free work?",
        a: `You're free to use Monstro-X with 90% of features such as gamification, attendance tracking, and more. 
        The only difference is that you'll have to pay for each transaction should you choose to use our payment processor (Stripe).
        `
    },
    {
        q: "What's the difference between the $99 and $299 monthly plans?",
        a: "The $299 plan has no additional transaction fees, advanced automation with workflows, done for you high converting website, and more."
    },
    {
        q: "Is there a contract or setup fee to use your membership software?",
        a: "No. All plans are contract-free, with no setup or onboarding fees. You can cancel or change your plan at the end of your billing cycle."
    },
    {
        q: "Can I switch plans later?",
        a: "Yes! You can upgrade or downgrade your plan anytime at the end of your current billing cycle."
    },
    {
        q: "What's included in all plans?",
        a: "Every Monstro-X membership software plan includes:\n\n- Full gamification engine (points, rewards, streaks, leaderboards)\n- Community chat and posts to build member connection\n- Built-in AI assistant for billing, hours, and FAQs\n- Unlimited members and staff accounts\n- White-labeled CRM (GoHighLevel)\n- Integration with Stripe for payment processing"
    },
    {
        q: "Is Monstro-X membership software good for martial arts, music, or fitness schools?",
        a: "Yes. Monstro-X was built specifically for group-class businesses like martial arts academies, dance studios, music schools, and fitness gyms. It's not generic—it's designed to boost retention and referrals in community-based programs."
    },
    {
        q: "Does Monstro-X support unlimited members?",
        a: "Yes! All plans include unlimited members, and unlimited staff accounts."
    },
    {
        q: "Can I get a refund if I cancel?",
        a: "We do not offer refunds. However, you can cancel any time before your next billing cycle to avoid future charges."
    }
]

export function FAQs() {
    return (
        <div className="space-y-1">
            <div className=" font-semibold mb-2">Got Questions? We've Got Answers.</div>
            <div className='flex flex-col max-w-3xl mx-auto gap-2'>
                {faqs.map((faq, i) => (
                    <Collapsible key={i} className='rounded-lg border border-foreground/10 p-3'>
                        <CollapsibleTrigger asChild>
                            <div className='flex font-semibold cursor-pointer justify-between items-center'>
                                {faq.q}
                                <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
                                    <ChevronDown className="size-5 cursor-pointer" />
                                </Button>
                                <span className="sr-only">Toggle</span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className='py-4 text-base'>
                            <div className="prose prose-p:text-base text-muted-foreground" dangerouslySetInnerHTML={{ __html: faq.a }} />
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </div>
    )
}