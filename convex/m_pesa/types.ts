export interface MPesaExpressRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  Amount: string;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface MPesaExpressResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MPesaExpressResult {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name:
            | "Amount"
            | "MpesaReceiptNumber"
            | "Balance"
            | "TransactionDate"
            | "PhoneNumber";
          Value: number | string;
        }>;
      };
    };
  };
}

export enum MPesaExpressError {
  DS_TIMEOUT = 1037,
  PUSH_ERROR = 1025,
  USSD_PUSH_ERROR = 9999,
  NO_USER_RESPONSE = 1037,
  USER_CANCELED = 1032,
  INSUFFICIENT_BALANCE = 1,
  INVALID_INITIATOR = 2001,
  TRANSACTION_EXPIRED = 1019,
  DUPLICATE_TRANSACTION = 1001,
}
