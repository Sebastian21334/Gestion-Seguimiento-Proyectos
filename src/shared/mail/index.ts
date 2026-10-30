import "server-only";
import { EmailClient } from "@azure/communication-email";
import { env } from "@/shared/config/env";
import { EmailDeliveryError } from "@/shared/errors";
import { htmlToPlainText } from "./html";
export { htmlToPlainText, escapeHtml } from "./html";

const client = new EmailClient(env.ACS_CONNECTION_STRING);

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const poller = await client.beginSend(
      {
        senderAddress: env.ACS_SENDER_ADDRESS,
        recipients: { to: [{ address: message.to }] },
        content: {
          subject: message.subject,
          html: message.html,
          plainText: htmlToPlainText(message.html),
        },
      },
      { abortSignal: AbortSignal.timeout(15_000) },
    );
    if (
      poller.getOperationState().error ||
      poller.getResult()?.status === "Failed" ||
      poller.getResult()?.status === "Canceled"
    )
      throw new EmailDeliveryError();
  } catch {
    throw new EmailDeliveryError();
  }
}
