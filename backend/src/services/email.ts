// Email delivery via Resend (https://resend.com), plain fetch — no SDK.
//
// Configuration (Render → Environment on the API service):
//   RESEND_API_KEY — API key from resend.com/api-keys
//   EMAIL_FROM     — the verified sender, e.g. "Grand Plaza Hotel <stay@grandplaza.example>"
//                    (Resend delivers to any address only from a verified domain;
//                    the sandbox address onboarding@resend.dev only delivers
//                    to the Resend account owner's own email.)
// When either variable is missing, sendEmail() reports not-configured and
// the caller keeps its old log-only behaviour — the server never crashes
// and never claims an email was sent.
export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  /** Resend message id, when the send succeeded. */
  id?: string;
  /** Human-readable reason, when the send did not happen. */
  error?: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return {
      sent: false,
      error: 'Email is not configured (set RESEND_API_KEY and EMAIL_FROM)',
    };
  }
  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? toPlainText(input.html),
      }),
    });
  } catch (error) {
    return {
      sent: false,
      error: `Could not reach the email provider: ${error instanceof Error ? error.message : 'network error'}`,
    };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      sent: false,
      error: `The email provider rejected the email (${res.status}): ${body.slice(0, 200)}`,
    };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: data.id };
}

/** Welcome email sent by the check-in automation. */
export function welcomeEmail(args: {
  hotelName: string;
  guestName: string;
  roomNumber: string | null;
}): { subject: string; html: string } {
  const { hotelName, guestName, roomNumber } = args;
  return {
    subject: `Welcome to ${hotelName}`,
    html: [
      `<p>Dear ${guestName},</p>`,
      `<p>Welcome to ${hotelName}${roomNumber ? ` — your room is ${roomNumber}` : ''}. We hope you enjoy your stay.</p>`,
      `<p>If you need anything, just ask at the front desk.</p>`,
      `<p>— ${hotelName}</p>`,
    ].join('\n'),
  };
}

/** Invoice email sent from the Billing page. */
export function invoiceEmail(args: {
  hotelName: string;
  guestName: string;
  invoiceNumber: string;
  total: number;
}): { subject: string; html: string } {
  const { hotelName, guestName, invoiceNumber, total } = args;
  return {
    subject: `Your invoice ${invoiceNumber} from ${hotelName}`,
    html: [
      `<p>Dear ${guestName},</p>`,
      `<p>Thank you for staying with ${hotelName}. Your invoice ${invoiceNumber} totals $${total.toFixed(2)}.</p>`,
      `<p>Please settle any remaining balance at the front desk.</p>`,
      `<p>— ${hotelName}</p>`,
    ].join('\n'),
  };
}
