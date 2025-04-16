export const IntergrationPartners = [
    {
        name: "GHL",
        description: "GHL is a payment gateway",
        url: "https://marketplace.gohighlevel.com/oauth/chooselocation",
        logo: "ghl-logo.jpg",
        tags: ["Marketing"],
        options: {
            response_type: "code",
            redirect_uri: "/dashboard/settings/integrations/ghl",
            client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID!,
            scope: ["oauth.write", "oauth.readonly"]
        }
    },
    {
        name: "Stripe",
        description: "Stripe is a payment gateway",
        url: "https://connect.stripe.com/oauth/v2/authorize",
        logo: "stripe-logo.png",
        tags: ["Payment"],
        options: {
            response_type: "code",
            client_id: process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID!,
            scope: "read_write",
            redirect_uri: "/callbacks/integrations/stripe",
            state: ""
        }
    }
]
