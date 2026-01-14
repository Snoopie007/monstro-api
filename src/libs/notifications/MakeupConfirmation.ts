import { serviceApiClient } from "@/libs/api/server";

export interface MakeupConfirmationPayload {
  memberId: string;
  memberEmail: string;
  memberFirstName: string;
  originalClass: {
    name: string;
    date: string;
    time: string;
  };
  makeupClass: {
    name: string;
    date: string;
    time: string;
    instructorFirstName?: string;
    instructorLastName?: string;
  };
  creditsRemaining?: number;
  locationName: string;
  locationAddress?: string;
}

export interface MakeupNotificationResult {
  success: boolean;
  jobId?: string;
}

export async function sendMakeupConfirmationNotification(
  locationId: string,
  payload: MakeupConfirmationPayload
): Promise<MakeupNotificationResult> {
  const api = serviceApiClient();
  
  try {
    const result = await api.post(
      `/protected/locations/${locationId}/notifications/makeup/confirm`,
      payload as unknown as Record<string, unknown>
    ) as MakeupNotificationResult;
    
    return result;
  } catch (error) {
    console.error('Failed to send makeup confirmation notification:', error);
    throw error;
  }
}
