/**
 * Chat API Service
 * Handles all HTTP requests and API interactions for the chat system
 */

interface SendMessageRequest {
  message: string;
  sessionId: string | null;
  contactId?: string;
  contactType?: string;
}

interface JobResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface JobStatusResponse {
  success: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  result?: any;
  failedReason?: string;
}

/**
 * Extracts location ID from current URL path
 */
function getLocationIdFromPath(): string {
  if (typeof window === "undefined") {
    throw new Error("Cannot get location ID on server side");
  }
  return window.location.pathname.split("/")[3];
}

/**
 * Sends a message to the bot chat endpoint
 */
export async function sendMessage(
  botId: string,
  request: SendMessageRequest
): Promise<JobResponse> {
  const locationId = getLocationIdFromPath();

  const response = await fetch(
    `/api/protected/loc/${locationId}/bots/${botId}/admin-chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Checks the status of a background job
 */
export async function getJobStatus(
  botId: string,
  jobId: string
): Promise<JobStatusResponse> {
  const locationId = getLocationIdFromPath();

  const response = await fetch(
    `/api/protected/loc/${locationId}/bots/${botId}/admin-chat?jobId=${jobId}`
  );

  if (!response.ok) {
    throw new Error(`Job status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Resets a bot's session
 */
export async function resetSession(
  botId: string,
  sessionId: string
): Promise<void> {
  const locationId = getLocationIdFromPath();

  const response = await fetch(
    `/api/protected/loc/${locationId}/bots/${botId}/admin-chat/reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }
  );

  if (!response.ok) {
    throw new Error(`Session reset failed: ${response.status}`);
  }
}

/**
 * Polls for job completion with configurable retry logic
 */
export async function pollForJobCompletion(
  botId: string,
  jobId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (attempt: number) => void;
  } = {}
): Promise<any> {
  const { maxAttempts = 30, intervalMs = 1000, onProgress } = options;
  let attempts = 0;

  const poll = async (): Promise<any> => {
    attempts++;
    onProgress?.(attempts);

    const jobData = await getJobStatus(botId, jobId);

    if (jobData.status === "completed" && jobData.result) {
      return jobData.result;
    } else if (jobData.status === "failed") {
      throw new Error(jobData.failedReason || "Job processing failed");
    } else if (attempts >= maxAttempts) {
      throw new Error("Job processing timeout");
    } else {
      // Still processing, continue polling
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      return poll();
    }
  };

  return poll();
}
