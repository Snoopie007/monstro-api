import { MonstroPackage, MonstroPlan } from "@/types/vendor";



const packages: MonstroPackage[] = [
    {
        id: 1,
        name: "Scale",
        price: 8000,
        description: "Scale your business with our comprehensive package that includes everything you need to grow your online presence. Get access to premium features, dedicated support, and proven strategies.",
        benefits: [
            {
                name: "Benefit 1",
                description: "Benefit 1 description"
            },
            {
                name: "Benefit 2",
                description: "Benefit 2 description"
            }

        ],
        paymentPlans: [
            {
                name: "Pay In Full",
                description: "Pay in full today for a $500 discount.",
                downPayment: 8000,
                discount: 500,
                monthlyPayment: 0,
                length: 0,
                interval: "mo.",
                trial: 0,
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "12 Months",
                description: "$2000 down,  $500 for 12 months.",
                downPayment: 2000,
                monthlyPayment: 500,
                discount: 0,
                length: 12,
                interval: "mo.",
                trial: 30,
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "0 Down",
                description: "Pay 0 down, $500 for 18 months.",
                downPayment: 0,
                discount: 0,
                monthlyPayment: 500,
                length: 18,
                interval: "mo.",
                trial: 0,
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }

        ]
    },
    {
        id: 2,
        name: "Monster",
        price: 15000,
        description: "Our most comprehensive plan, designed for businesses that want to maximize their growth potential. Includes advanced features, priority support, and exclusive benefits to help scale your business effectively.",
        benefits: [
            {
                name: "Benefit 1",
                description: "Benefit 1 description"
            },
            {
                name: "Benefit 2",
                description: "Benefit 2 description"
            }
        ],
        paymentPlans: [
            {
                name: "12 Months",
                description: "12 Months payment plan",
                downPayment: 8000,
                monthlyPayment: 500,
                length: 12,
                interval: "mo.",
                discount: 0,
                trial: 30,
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            },
            {
                name: "Pay In Full",
                description: "24 Months payment plan",
                downPayment: 15000,
                discount: 1000,
                monthlyPayment: 0,
                length: 0,
                trial: 0,
                interval: "mo.",
                priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
            }
        ]
    }
]

const plans: MonstroPlan[] = [

    {
        id: 1,
        name: "Pay as you go",
        price: 0,
        interval: "mo.",
        benefits: [{
            name: "$10 per new member",
            description: "You'll be charged $10 per new member (once), and 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1% per transaction",
            description: "You'll be charged 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1x AI Bot"
        }],
        description: `Get full access to Monstro free with basic support (email & live chat only). Pay only for new member sign ups and transactions. 
        <span>You'll be charged $10 per new member (once).`,
        note: "Stripe transaction fees apply. (2.9% + $0.30)",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    },
    {
        id: 2,
        name: "Basic",
        price: 99,
        interval: "mo.",
        benefits: [{
            name: "$10 per new member",
            description: "You'll be charged $10 per new member (once), and 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1% per transaction",
            description: "You'll be charged 1% per transaction on top of the standard stripe transaction fee (2.9% + $0.30)."
        }, {
            name: "1x AI Bot"
        }],
        description: "Get full access to Monstro free with basic support (email & live chat only). Pay only for new member sign ups and transactions.",
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    },
    {
        id: 3,
        name: "Premium",
        price: 299,
        interval: "mo.",
        benefits: [
            {
                name: "No new member fee",
                description: "No extra charges when a new member joins your business."
            },
            {
                name: "0% per transaction",
                description: "No additional transaction fees. Standard stripe transaction still applies (2.9% + $0.30)."
            },
            {
                name: "Unlimited",
            },
            {
                name: "Advance Automation",
                description: "Advance Automation"
            },
            {
                name: "Monstro Marketing Suite",
                description: "Get access to Monstro Marketing Suite, capabale of creating unlimited marketing campaigns."
            },
            {
                name: "Premium Support",
            }
        ],
        description: `Get full access to Monstro free. No new member fees. 
            <span> No additional transaction fees.fsdfsdfsd.
        `,
        priceId: "price_1NVhoxDePDUzIffAPzStEiBA"
    }
]


const dummyContract = `
<div class="waiver document-area">
                <p><strong>The Grind Martial Arts Academy Waiver (Includes COVID-19)</strong></p>
<p>Release <span class="variable" data-type="mention" data-id="1" data-label="First Name" data-value="contact.firstName">@First Name</span> and Waiver of Liability and Indemnity Agreement</p>
<p>(<strong><u>Read Carefully Before Signing</u></strong>)</p>
<p>In consideration of being permitted to participate in any way in the Jiu Jitsu Program indicated below and/or be permitted to enter for any purpose, any restricted area (herein defined as any area where admittance to the general public is prohibited), the parent(s) and/or guardian(s) of the minor participant named below agree:</p>
<p>&nbsp;</p>
<ol>
<li>The parent(s) and/or legal guardian(s) will instruct the minor participant that prior to participating in the below martial arts activity or event, he or she should inspect the facilities and equipment to be used, and if he or she believes anything is unsafe, the participant should immediately advise the officials of such condition and refuse to participate. I understand and agree that, if at any time, I feel anything to be unsafe; I will immediately take all precautions to avoid the unsafe area and refuse to participate further.</li>
<li>I/We fully understand and acknowledge that:</li>
<li>There are risks and dangers associated with participation in martial arts events and activities which could result in bodily injury partial and/or total disability, paralysis, and death.</li>
<li>The social and economic losses and/or damages, which could result from these risks and dangers described above, could be severe.</li>
<li>These risks and dangers may be caused by the action, inaction, or negligence of the participant or the action, inaction, or negligence of others, including, but not limited to, the Releasees named below.</li>
<li>There may be other risks not known to us or are not reasonably foreseeable at this time.</li>
<li>I/We accept and assume such risks and responsibility for the losses and/or damages following such injury, disability, paralysis, or death, however, caused and whether caused in whole or in part by the negligence of the Releasees named below.</li>
<li>I/We <strong><u>HEREBY RELEASE, WAIVE, DISCHARGE AND COVENANT NOT TO SUE</u></strong> the martial arts facility used by the participant, including its owners, managers, promoters, lessees of premises used to conduct the martial art event or program, premises and event inspectors, underwriters, consultants and others who give recommendations, directions or instructions to engage in risk evaluation or loss control activities regarding the martial arts facility or events held at such facility and each of them, their directors, officers, agents, employees, all for the purpose herein referred to as “Releasee”…From all liability to the undersigned, my/our personal representatives, assigns, executors, heirs and next to kin for any and all claims, demands, losses or damages, and any claims or demands therefore on account of any injury, including but not limited to the death of the participant or damage to property, arising out of or relating to the event(s) caused alleged to be caused in whole or in part by the negligence of the releasee or otherwise.</li>
<li>I/We <strong>HEREBY</strong> acknowledge that <strong>THE ACTIVITIES OF THE EVENT(S) ARE VERY</strong> <strong>DANGEROUS</strong> and involve the risk of significant injury and/or death and/or property damage. Each of <strong>THE UNDERSIGNED</strong> also expressly acknowledges that <strong>INJURIES RECEIVED MAY BE</strong> <strong>COMPOUNDED OR INCREASED BY NEGLIGENT RESCUE OPERATIONS OR PROCEDURES OF THE RELEASEES.</strong></li>
<li><strong>EACH OF THE UNDERSIGNED</strong> further expressly agrees that the foregoing release, waiver, and indemnity agreement is intended to be as broad and inclusive as is permitted by the law of the Province or State in which the event is conducted and that if any portion is held invalid, it is agreed that the balance shall, notwithstanding continue in full legal force and effect.</li>
<li>On behalf of the participant and individually, the undersigned partner(s) and/or legal guardian(s) will reimburse the Releasee for any money which they have paid to the participant, or on his/her behalf, and hold them harmless.</li>
</ol>
<p>I HAVE READ THIS RELEASE AND WAIVER OF LIABILITY, ASSUMPTION OF RISK AND INDEMNITY AGREEMENT, FULLY UNDERSTAND ITS TERMS, UNDERSTAND THAT I HAVE GIVEN UP SUBSTANTIAL RIGHTS BY SIGNING IT, AND HAVE SIGNED IT FREELY AND VOLUNTARILY WITHOUT ANY INDUCEMENT, ASSURANCE, OR GUARANTEE BEING MADE TO ME AND INTEND MY SIGNATURE TO BE COMPLETE AND UNCONDITIONAL RELEASE OF ALL LIABILITY TO THE GREATEST EXTENT ALLOWED BY LAW.</p>
<p><strong><u>COVID-19 WAIVER</u></strong></p>
<p>The novel Coronavirus, COVID-19, has been declared a worldwide pandemic by the World Health Organization. COVID-19 is EXTREMELY CONTAGIOUS and is believed to spread mainly from person-to-person contact. As a result, federal, state, and local governments and federal and state health agencies recommend social distancing and have, in many locations, prohibited the congregation of groups of people.</p>
<p>&nbsp;</p>
<p>The Grind Martial Arts Academy has put in place preventative measures to reduce the spread of COVID-19, however, The Grind Martial Arts Academy <strong>CANNOT GUARANTEE</strong> that you or your child(ren) will not become infected with COVID-19. Further attending The Grind Martial Arts Academy could increase your risk and or your child(ren)’s risk of contracting COVID-19.</p>
<p>&nbsp;</p>
<p><strong><u>COVID-19 WAIVER</u></strong></p>
<p>&nbsp;</p>
<p>By signing this agreement, I acknowledge the contagious nature of COVID-19 and voluntarily assume the risk that my child(ren) and I may be exposed to or infected by COVID-19 by attending The Grind Martial Arts Academy and that such exposure or infection may result in personal injury illness, permanent disability and/or death. I understand the risk of becoming exposed to or infected by COVID-19 at The Grind Martial Arts Academy may result from the actions, omissions, or negligence of myself and others. Including, but not limited to Coaches, volunteers, and program participants and their families.</p>
<p>&nbsp;</p>
<p>I voluntarily agree to assume all of the foregoing risks and accept sole responsibility for any injury to my child(ren) or myself (including, but not limited to personal injury, disability and death), illness damage, loss, claim, liability, or expense of any kind, that I or my child(ren) may experience or incur in connection with my child(ren)’s attendance at The Grind Martial Arts Academy or participation in programs or tournaments. (“Claims”) On my behalf and on behalf of my child(ren), I nearby release, covenant not to sue, discharge, and hold harmlessness to The Grind Martial Arts Academy or its coaches. Including all liabilities, claims, actions, damages, costs, or expenses of claims based on the actions, omissions, or negligence of The Grind Martial Arts Academy or its coaches. Whether COVID-19 infection occurs before, during, or after participation in a The Grind Martial Arts Academy practice or program.</p>            </div>



`

export { plans, packages, dummyContract };
