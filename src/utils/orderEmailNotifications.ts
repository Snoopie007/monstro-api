import { notifyVendorUsersNewEcommerceOrder } from "@/libs/novu";
import { emailQueue } from "@/queues";
import type { OrderLineItem } from "@/subtrees/types";
import { fetchVendorNotificationUsers } from "@/utils/vendorNotificationUsers";

const CUSTOMER_VISIBLE_ORDER_STATUSES: Record<string, true> = {
    shipped: true,
    delivered: true,
    cancelled: true,
    refunded: true,
};
const STATUS_LABELS: Record<string, string> = {
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
};
const ORDER_EMAIL_JOB_OPTIONS = {
    removeOnComplete: {
        age: 60 * 60 * 24 * 30,
        count: 10000,
    },
    removeOnFail: false,
};
const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

export type OrderNotificationContext = {
    order: {
        id: string;
        locationId: string;
        memberId: string | null;
        trackingNumber: string | number | null;
        status: string;
        subtotal: number;
        shipping: number;
        tax: number;
        processingFee: number;
        total: number;
        items: OrderLineItem[] | null;
    };
    member?: {
        firstName: string;
        lastName?: string | null;
        email: string;
        phone?: string | null;
    } | null;
    location: {
        name: string;
        email?: string | null;
        phone?: string | null;
        vendor?: {
            user?: {
                id?: string | null;
                email?: string | null;
            } | null;
        } | null;
    };
};

export async function queueOrderPaidNotifications(context: OrderNotificationContext) {
    const { order, member, location } = context;

    try {
        if (!member) {
            console.warn(`[order-email] Order ${order.id} has no member; skipping paid order notifications`);
            return;
        }

        const metadata = {
            member,
            location: {
                name: location.name,
                email: location.email,
                phone: location.phone,
            },
            order: {
                ...order,
                items: order.items ?? [],
            },
        };

        const orderNumber = String(order.trackingNumber || order.id);
        const jobs = [
            emailQueue.add("send-email", {
                to: member.email,
                subject: `Your order from ${location.name} is confirmed`,
                template: "OrderReceiptEmail",
                metadata,
            }, {
                ...ORDER_EMAIL_JOB_OPTIONS,
                jobId: `order:${order.id}:receipt`,
            }),
        ];

        if (location.email) {
            jobs.push(emailQueue.add("send-email", {
                to: location.email,
                subject: `New order received: ${orderNumber}`,
                template: "NewOrderAlertEmail",
                metadata,
            }, {
                ...ORDER_EMAIL_JOB_OPTIONS,
                jobId: `order:${order.id}:vendor-alert`,
            }));
        }

        await Promise.all(jobs);

        const vendorNotificationUsers = await fetchVendorNotificationUsers(
            order.locationId,
            location.vendor?.user
        );
        const notificationResult = await notifyVendorUsersNewEcommerceOrder({
            users: vendorNotificationUsers,
            locationName: location.name,
            locationId: order.locationId,
            orderId: order.id,
            orderNumber,
            memberName: `${member.firstName} ${member.lastName || ""}`.trim(),
            total: currencyFormatter.format(order.total / 100),
        });

        if ("failed" in notificationResult && notificationResult.failed) {
            console.error(`[order-email] Failed to send ${notificationResult.failed} vendor order notifications`, notificationResult.errors);
        }
    } catch (error) {
        console.error(`[order-email] Failed to queue paid order notifications for ${order.id}`, error);
    }
}

export async function queueOrderStatusUpdateNotification(context: OrderNotificationContext, nextStatus: string) {
    const { order, member, location } = context;

    if (!CUSTOMER_VISIBLE_ORDER_STATUSES[nextStatus]) {
        return;
    }

    try {
        if (!member) {
            console.warn(`[order-email] Order ${order.id} has no member; skipping status email`);
            return;
        }

        await emailQueue.add("send-email", {
            to: member.email,
            subject: `Order ${STATUS_LABELS[nextStatus] || nextStatus}: ${String(order.trackingNumber || order.id)}`,
            template: "OrderStatusUpdateEmail",
            metadata: {
                member: {
                    firstName: member.firstName,
                    lastName: member.lastName,
                },
                location: {
                    name: location.name,
                    email: location.email,
                    phone: location.phone,
                },
                order: {
                    id: order.id,
                    trackingNumber: order.trackingNumber,
                    status: nextStatus,
                    total: order.total,
                },
            },
        }, {
            ...ORDER_EMAIL_JOB_OPTIONS,
            jobId: `order:${order.id}:status:${nextStatus}`,
        });
    } catch (error) {
        console.error(`[order-email] Failed to queue status email for ${order.id}`, error);
    }
}
