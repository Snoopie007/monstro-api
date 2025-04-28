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
    },
    {
        name: "Quickbooks",
        description: "Quickbooks is an accounting software",
        url: "https://appcenter.intuit.com/connect/oauth2",
        logo: "quickbooks-logo.png",
        tags: ["Accounting"],
        options: {
            client_id: process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID,
            client_secret: process.env.QUICKBOOKS_CLIENT_SECRET,
            response_type: 'code',
            scope: process.env.NEXT_PUBLIC_QUICKBOOKS_SCOPE,
            redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI,
            state: '',
        }
    }
]
