
import { VendorStripePayments } from "@/libs/server/stripe";
import { auth } from "@/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import Stripe from "stripe";
import Invoices from "./Invoices";
import Charges from "./Charges";

async function getCustomerInvoices(customerId: string): Promise<{ invoices: Stripe.Invoice[], charges: Stripe.Charge[] }> {
    try {
        const stripe = new VendorStripePayments();
        stripe.setCustomer(customerId);
        const invoices = await stripe.getInvoices(25);
        const charges = await stripe.getCharges(25);

        return { invoices, charges }

    } catch (error) {
        console.log(error);
        return { invoices: [], charges: [] };
    }
}


export default async function InvoicesPage(props: { params: Promise<{ id: number }> }) {
    const session = await auth();

    const invoices = await getCustomerInvoices(session?.user.stripeCustomerId);

    return (
        <Tabs defaultValue="invoices">
            <TabsList className="rounded-none p-0 bg-transparent border-none mb-2 gap-2">
                <TabsTrigger value="invoices" className="bg-foreground/5">Invoices</TabsTrigger>
                <TabsTrigger value="charges" className=" bg-foreground/5">Charges</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
                <Invoices invoices={invoices.invoices} />
            </TabsContent>
            <TabsContent value="charges">
                <Charges charges={invoices.charges} />
            </TabsContent>
        </Tabs>
    )
}
