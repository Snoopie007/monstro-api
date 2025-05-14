export const IntergrationPartners = [
    {
        name: "GHL",
        description: "GHL is a payment gateway",
        url: "https://marketplace.gohighlevel.com/oauth/chooselocation",
        logo: "ghl-logo.webp",
        tags: ["Marketing"],
        options: {
            response_type: "code",
            redirect_uri: "http//localhost:3000/callbacks/integrations/gl",
            client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID!,
            scope: ["oauth.write", "oauth.readonly"],
            state: "test123",
        }
    },
    {
        name: "Stripe",
        description: "Stripe is a payment gateway",
        url: "https://connect.stripe.com/oauth/v2/authorize",
        logo: "stripe-logo.webp",
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
        logo: "quickbooks-logo.webp",
        tags: ["Accounting"],
        options: {
            client_id: process.env.NEXT_PUBLIC_QUICKBOOKS_CLIENT_ID,
            response_type: 'code',
            scope: 'com.intuit.quickbooks.accounting',
            redirect_uri: 'http://localhost:3000/callbacks/integrations/quickbooks',
            state: 'test123',
        }
    }
]
