import { notifyVendorUsersDocumentSigned } from "@/libs/novu";
import { fetchVendorNotificationUsers } from "@/utils/vendorNotificationUsers";

/** Tells the location's owner and active staff, in the vendor portal inbox, that a member signed a document. Never throws. */
export async function notifyDocumentSigned({ docId, vendorUser, ...notification }: {
    docId: string;
    memberId: string;
    memberName: string;
    documentTitle: string;
    locationId: string;
    locationName: string;
    vendorUser?: { id?: string | null; email?: string | null } | null;
}) {
    try {
        const users = await fetchVendorNotificationUsers(notification.locationId, vendorUser);
        const result = await notifyVendorUsersDocumentSigned({ users, ...notification });
        if ("failed" in result && result.failed) {
            console.error(`[docs] ${result.failed} vendor notification(s) failed for signed document ${docId}`, result.errors);
        }
    } catch (error) {
        console.error(`[docs] Failed to notify vendor users that ${docId} was signed`, error);
    }
}
