import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const httpGetHome = httpAction(async () => {
  return new Response("Convex HTTP Server", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const postStKPushCallback = httpAction(async (ctx, request) => {
  // PARSE MPESA CALLBACK
  const body = await request.json();
  console.log(JSON.stringify("MPESA CALLBACK: ", body));

  try {
    // DESTRUCTURE MPESA CALLBACK
    const stkCallback = body.Body.stkCallback;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } =
      stkCallback;

    // GET THE MPESA TRANSACTIONS
    const existingMpesaTransaction = await ctx.runQuery(
      api.features.mpesa_transactions.getByCheckoutRequestID,
      {
        checkoutRequestID: CheckoutRequestID,
      }
    );
    if (existingMpesaTransaction) {
      // Prepare update data
      const updateData: any = {
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      };

      // Handle successful transaction
      if (ResultCode === 0 && stkCallback.CallbackMetadata) {
        const metadata = stkCallback.CallbackMetadata.Item.reduce(
          (acc: any, item: any) => {
            acc[item.Name] = item.Value;
            return acc;
          },
          {}
        );

        updateData.amount = metadata.Amount;
        updateData.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
      }

      // HANDLE MPESA TRANSACTIONS UPDATE
      await ctx.runMutation(api.features.mpesa_transactions.updateTransaction, {
        id: existingMpesaTransaction._id,
        ...updateData,
      });

      // HANDLE TRANSACTIONS LOGIC
      if (existingMpesaTransaction.paymentFor === "STORE") {
        let paymentStatus:
          | "PENDING"
          | "ERRORED"
          | "CANCELLED"
          | "TIMEDOUT"
          | "CONFIRMED";

        switch (ResultCode) {
          case 0:
            paymentStatus = "CONFIRMED"; // Payment successful
            break;
          case 1032:
            paymentStatus = "CANCELLED"; // Payment cancelled by user
            break;
          case 1037:
            paymentStatus = "TIMEDOUT"; // Payment request timed out
            break;
          default:
            paymentStatus = "ERRORED"; // Any other case is considered an error
            break;
        }

        // Update the transaction status
        await ctx.runMutation(
          api.features.transactions.updateTransactionStatus,
          {
            checkoutRequestID: CheckoutRequestID,
            paymentStatus: paymentStatus,
          }
        );
      }

      // HANDLE SUBSCRIPTIONS LOGIC
      if (
        ResultCode === 0 &&
        existingMpesaTransaction.paymentFor === "SUBSCRIPTION"
      ) {
        await ctx.runMutation(api.users.activateSubscription, {
          checkoutRequestID: existingMpesaTransaction.checkoutRequestID,
        });
      }
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const postSMSCallback = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const sms = await ctx.runQuery(api.features.sms.getSMSByMessageId, {
      messageId: body.messageid,
    });
    if (sms) {
      await ctx.runMutation(api.features.sms.updateSMSByMessageID, {
        messageId: body.messageid,
        status: body.description,
        timeTaken: body.timeTaken,
        timeStamp: body.timestamp,
        service: sms.service,
      });
      if (sms.service == "SCHEDULER") {
        const ev = await ctx.runQuery(
          api.features.scheduled_events.getScheduledEventsByMessageID,
          { messageId: body.messageid }
        );
        if (ev) {
          await ctx.runMutation(
            api.features.scheduled_events.updateEventStatus,
            {
              id: ev._id,
              status: "SUCCESS",
            }
          );
        }
      }
    }

    // Return the body in the response
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle errors
    return new Response(
      JSON.stringify({ error: "Invalid JSON or body could not be parsed." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
