/**
 * Session Cancellation Notification Helper
 * 
 * Sends notifications to members when their reservations are cancelled
 * due to a session being deleted by vendor/staff.
 */

import { serviceApiClient } from "@/libs/api/server";

export interface AffectedMember {
  memberId: string;
  email: string;
  firstName: string;
  lastName?: string;
}

export interface SessionCancellationPayload {
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  instructorFirstName?: string;
  instructorLastName?: string;
  reason?: string;
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
 * Send session cancellation notifications to affected members
 * 
 * @param locationId - The location ID
 * @param payload - The notification payload containing affected members and session details
 * @returns The result from the notification API
 */
export async function sendSessionCancellationNotifications(
  locationId: string,
  payload: SessionCancellationPayload
): Promise<NotificationResult> {
  const api = serviceApiClient();
  
  try {
    const result = await api.post(
      `/protected/locations/${locationId}/notifications/session/cancel`,
      payload as unknown as Record<string, unknown>
    ) as NotificationResult;
    
    return result;
  } catch (error) {
    console.error('Failed to send session cancellation notifications:', error);
    throw error;
  }
}
