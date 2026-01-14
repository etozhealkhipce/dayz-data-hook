// Resend email integration
import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || "onboarding@resend.dev",
  };
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  name: string
): Promise<boolean> {
  try {
    console.log(`[Email] Attempting to send verification email to: ${to}`);
    const { client, fromEmail } = getResendClient();
    console.log(`[Email] Got Resend client, fromEmail: ${fromEmail}`);

    const senderEmail =
      fromEmail?.includes("@gmail.com") ||
      fromEmail?.includes("@yahoo.com") ||
      fromEmail?.includes("@hotmail.com")
        ? "onboarding@resend.dev"
        : fromEmail || "onboarding@resend.dev";

    const result = await client.emails.send({
      from: senderEmail,
      to,
      subject: "Verify your email - DayZ Tracker",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to DayZ Tracker, ${name}!</h2>
          <p>Please verify your email address by entering this code:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #666;">This code expires in 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error(`[Email] Resend API error:`, result.error);
      return false;
    }

    console.log(`[Email] Verification email sent successfully:`, result.data);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendPasswordChangeEmail(
  to: string,
  code: string,
  name: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();

    const senderEmail =
      fromEmail?.includes("@gmail.com") ||
      fromEmail?.includes("@yahoo.com") ||
      fromEmail?.includes("@hotmail.com")
        ? "onboarding@resend.dev"
        : fromEmail || "onboarding@resend.dev";

    const result = await client.emails.send({
      from: senderEmail,
      to,
      subject: "Password Change Confirmation - DayZ Tracker",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Change Request</h2>
          <p>Hello ${name},</p>
          <p>You requested to change your password. Enter this code to confirm:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #666;">This code expires in 15 minutes.</p>
          <p style="color: #c00; font-size: 12px;">If you didn't request this, please change your password immediately.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error(`[Email] Resend API error:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send password change email:", error);
    return false;
  }
}

export async function sendEmailChangeEmail(
  to: string,
  code: string,
  name: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();

    const senderEmail =
      fromEmail?.includes("@gmail.com") ||
      fromEmail?.includes("@yahoo.com") ||
      fromEmail?.includes("@hotmail.com")
        ? "onboarding@resend.dev"
        : fromEmail || "onboarding@resend.dev";

    const result = await client.emails.send({
      from: senderEmail,
      to,
      subject: "Confirm Your New Email - DayZ Tracker",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Change Confirmation</h2>
          <p>Hello ${name},</p>
          <p>You requested to change your email to this address. Enter this code to confirm:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #666;">This code expires in 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error(`[Email] Resend API error:`, result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email change email:", error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
