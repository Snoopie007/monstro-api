
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
        console.log(invoices)
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
        <div className="space-y-4">
            <Tabs>
                <TabsList>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="charges">Charges</TabsTrigger>
                </TabsList>
                <TabsContent value="invoices">
                    <Invoices invoices={invoices.invoices} />
                </TabsContent>
                <TabsContent value="charges">
                    <Charges charges={invoices.charges} />
                </TabsContent>
            </Tabs>



        </div>
    )
}
