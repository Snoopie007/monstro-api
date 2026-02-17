
export interface TokenResponse {
  token_type: 'bearer';
  access_token: string;
  expires_in: number;
  refresh_token: string;
  x_refresh_token_expires_in: number;
}

export interface PaymentRequest {
  amount: number;
  card: {
    number: string;
    expMonth: string;
    expYear: string;
    cvv: string;
  };
  currency: string;
  context: {
    mobile: boolean;
    isEcommerce: boolean;
  };
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  // Add other relevant fields from QuickBooks response
}

export interface ErrorResponse {
  error: string;
  error_description?: string;
  intuit_tid?: string;
}
