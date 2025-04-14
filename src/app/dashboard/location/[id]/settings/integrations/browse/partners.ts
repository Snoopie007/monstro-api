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
            client_id: "65850b0d2525182171c0e69d-lqg41p93",
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
            client_id: "ca_R9oj3AotaNhPhnWRyfOMQbdsGKtlIM0B",
            scope: "read_write",
            redirect_uri: "/callbacks/integrations/stripe",
            state: ""
        }
    }
]
