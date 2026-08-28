import { Elysia, t } from "elysia";
import { sendNotifications } from "@/libs/expo";
import { SquarePaymentGateway } from "@/libs/PaymentGateway";
import { SquareError, type CreatePaymentResponse } from "square";
import { GoogleAdsApi, enums, ResourceNames, toMicros } from 'google-ads-api';
const TEST_PUSH_TOKENS = [
    "ExponentPushToken[mRfnnIAg7baHwm4QgUH6Ay]",
    "ExponentPushToken[bBsoSMHiFy9hnQCXUJsqOq]",
    "ExponentPushToken[2bGQf-OeaQYLnnvo-iGjH5]",
];

export function testRoutes(app: Elysia) {
    return app
        // GET /public/test/push — send test push to TEST_PUSH_TOKENS (server must be running)
        .post("/test/push", async ({ set }) => {
            try {
                const messages = TEST_PUSH_TOKENS.map((to) => ({
                    to,
                    title: "Allen Mayorga",
                    body: "New message from Allen Mayorga",
                    icon: "https://avatars.githubusercontent.com/u/26342387?v=4",
                    channelId: "default",
                    categoryId: "message",
                    richContent: {
                        image: "https://avatars.githubusercontent.com/u/26342387?v=4",
                    },
                    data: { screen: "messages", messageId: "1234567890", chatId: "3534534" },
                }));
                const tickets = await sendNotifications(messages);
                return { ok: true, tickets, sent: tickets.length };
            } catch (error: any) {
                console.error(error);
                set.status = 500;
                return { ok: false, error: error?.message ?? "Failed to send test push" };
            }
        })
        .post("/test/square", async ({ body, set, status }) => {

            const square = new SquarePaymentGateway('EAAAl0X0euRh5YQiMD15NxkUmzyIwQ1cNsqkjCqEyuGjdvwUdjoLMttBo7SIhtlS');

            try {
                await square.createCharge('18WM5F8024S9H4QDJRZNPQ4ZW0', 'cnon:card-nonce-declined', {
                    total: 100000,
                    feesAmount: 1000,
                    currency: "USD",
                    note: "Test charge",
                    referenceId: "1234567890",
                    squareLocationId: "LY43BJ6XXMPAW",
                });
            } catch (e) {

                if (e instanceof SquareError) {
                    const body = e.body as CreatePaymentResponse | undefined;
                    if (body) {
                        status(500, { error: "Failed to create charge" });
                    }
                    const payment = body?.payment;
                    const errors = body?.errors;
                    console.log("payment", payment);
                    console.log("errors", errors);

                    return status(500, { error: "Failed to create charge" });
                }
                console.error(e);
            }
        })
        .post("/test/google", async ({ body, set, status }) => {

            const google = new GoogleAdsApi({
                client_id: process.env.AUTH_GOOGLE_ID!,
                client_secret: process.env.AUTH_GOOGLE_SECRET!,
                developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            });




            try {



                const refreshToken = process.env.AUTH_GOOGLE_REFRESH_TOKEN!;

                const customer = google.Customer({
                    customer_id: "6433886368",
                    login_customer_id: "1976356549",
                    refresh_token: refreshToken,
                });
                const cid = customer.credentials.customer_id;
                const budgetRn = ResourceNames.campaignBudget(cid, "-1");
                const campaignRn = ResourceNames.campaign(cid, "-2");
                const adGroupRn = ResourceNames.adGroup(cid, "-3");
                const result = await customer.mutateResources([
                    {
                        entity: "campaign_budget",
                        operation: "create",
                        resource: {
                            resource_name: budgetRn,
                            name: "API test $5 budget",
                            amount_micros: toMicros(5),
                            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
                            explicitly_shared: false,
                        },
                    },
                    {
                        entity: "campaign",
                        operation: "create",
                        resource: {
                            resource_name: campaignRn,
                            name: "API paused Search test",
                            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
                            status: enums.CampaignStatus.PAUSED,
                            campaign_budget: budgetRn,
                            contains_eu_political_advertising:
                                enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
                            manual_cpc: { enhanced_cpc_enabled: false },
                            network_settings: {
                                target_google_search: true,
                                target_search_network: true,
                                target_content_network: false,
                            },
                        },
                    },
                    {
                        entity: "ad_group",
                        operation: "create",
                        resource: {
                            resource_name: adGroupRn,
                            name: "Ad group 1",
                            campaign: campaignRn,
                            status: enums.AdGroupStatus.PAUSED,
                            type: enums.AdGroupType.SEARCH_STANDARD,
                        },
                    },
                    {
                        entity: "ad_group_ad",
                        operation: "create",
                        resource: {
                            ad_group: adGroupRn,
                            status: enums.AdGroupAdStatus.PAUSED,
                            ad: {
                                final_urls: ["https://mymonstro.com"],
                                responsive_search_ad: {
                                    headlines: [
                                        { text: "Martial Arts Classes" },
                                        { text: "Try a Free Class" },
                                        { text: "Train Near You" },
                                    ],
                                    descriptions: [
                                        { text: "Book a class online in minutes." },
                                        { text: "Programs for kids and adults." },
                                    ],
                                    path1: "classes",
                                },
                            },
                        },
                    },
                    {
                        entity: "ad_group_criterion",
                        operation: "create",
                        resource: {
                            ad_group: adGroupRn,
                            status: enums.AdGroupCriterionStatus.ENABLED,
                            keyword: {
                                text: "martial arts classes",
                                match_type: enums.KeywordMatchType.PHRASE,
                            },
                        },
                    },
                    {
                        entity: "ad_group_criterion",
                        operation: "create",
                        resource: {
                            ad_group: adGroupRn,
                            status: enums.AdGroupCriterionStatus.ENABLED,
                            keyword: {
                                text: "bjj near me",
                                match_type: enums.KeywordMatchType.PHRASE,
                            },
                        },
                    },
                    {
                        entity: "ad_group_criterion",
                        operation: "create",
                        resource: {
                            ad_group: adGroupRn,
                            status: enums.AdGroupCriterionStatus.ENABLED,
                            keyword: {
                                text: "kids karate",
                                match_type: enums.KeywordMatchType.PHRASE,
                            },
                        },
                    },
                ]);
                console.log(result);

                return status(200, { ok: true });
            } catch (error) {
                console.error(error);
                return status(500, { ok: false });
            }



        })
}