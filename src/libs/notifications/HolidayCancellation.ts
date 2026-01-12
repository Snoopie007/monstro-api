/**
 * Holiday Cancellation Notification Helper
 * 
 * Sends notifications to members when their reservations are cancelled
 * due to holiday closures or maintenance.
 */

import { serviceApiClient } from "@/libs/api/server";

export interface AffectedMember {
  memberId: string;
  email: string;
  firstName: string;
  lastName?: string;
  reservations: Array<{
    id: string;
    className: string;
    originalTime: string;
  }>;
}

export interface HolidayCancellationPayload {
  holidayName: string;
  holidayDate: string;
  affectedMembers: AffectedMember[];
  locationName: string;
  locationAddress?: string;
  locationEmail?: string;
  locationPhone?: string;
  makeupBaseUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  queued: number;
  failed: number;
  jobIds: string[];
  errors?: Array<{ memberId: string; error: string }>;
}

/**
 * Send holiday cancellation notifications to affected members
 * 
 * @param locationId - The location ID
 * @param payload - The notification payload containing affected members and closure details
 * @returns The result from the notification API
 */
export async function sendHolidayCancellationNotifications(
  locationId: string,
  payload: HolidayCancellationPayload
): Promise<NotificationResult> {
  const api = serviceApiClient();
  
  try {
    const result = await api.post(
      `/protected/locations/${locationId}/notifications/holiday/cancel`,
      payload as unknown as Record<string, unknown>
    ) as NotificationResult;
    
    return result;
  } catch (error) {
    console.error('Failed to send holiday cancellation notifications:', error);
    throw error;
  }
}
