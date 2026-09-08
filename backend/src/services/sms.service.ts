import axios from 'axios';

function isConfigured(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID);
}

export function isSmsConfigured(): boolean {
  return isConfigured();
}

/**
 * Sends one SMS via MSG91's REST API (India-focused gateway, matching the
 * business's location). Like sendEmail, this returns a result object
 * rather than throwing, and no-ops cleanly if MSG91_AUTH_KEY isn't set —
 * SMS is an optional feature, not a hard dependency.
 *
 * MSG91's flow/template API varies by account setup; this uses their
 * simpler legacy-compatible "send SMS" endpoint for a plain text message.
 * If a specific DLT-registered template is required (mandatory for
 * transactional SMS to Indian numbers), swap the request body for
 * MSG91's Flow API with a template ID instead — see their docs at
 * https://docs.msg91.com/.
 */
export async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'MSG91 is not configured' };
  }

  const authKey = process.env.MSG91_AUTH_KEY!;
  const senderId = process.env.MSG91_SENDER_ID!;
  // Indian mobile numbers are stored as plain 10 digits (see the Mobile
  // validation regex in employee.controller.ts) — MSG91 expects a country
  // code prefix.
  const formattedNumber = to.startsWith('91') ? to : `91${to}`;

  try {
    await axios.post(
      'https://control.msg91.com/api/v5/flow/',
      {
        sender: senderId,
        route: '4', // transactional route
        country: '91',
        sms: [{ message, to: [formattedNumber] }],
      },
      { headers: { authkey: authKey, 'Content-Type': 'application/json' } }
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.message || err.message || 'Unknown SMS error' };
  }
}
