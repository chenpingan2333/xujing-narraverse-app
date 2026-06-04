/**
 * Send email via Resend API.
 *
 * Requires RESEND_API_KEY in environment.
 * Sender domain must be verified in Resend dashboard.
 */
import { Resend } from "resend";

const RESEND_API_KEY = process.env["RESEND_API_KEY"] ?? "";
const RESEND_FROM = process.env["RESEND_FROM"] ?? "auth@send.modelbridge.top";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: `叙境 <${RESEND_FROM}>`,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend returned no email ID");
  }

  return { id: data.id };
}

/** Check if Resend is configured and ready */
export function isResendConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}
