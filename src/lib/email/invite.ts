import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface SendInviteEmailParams {
  email: string
  token: string
  invitedBy: string
  appUrl?: string
}

export async function sendInviteEmail({
  email,
  token,
  invitedBy,
  appUrl: providedAppUrl,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  // Check if Resend is configured
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn(
      '⚠️ RESEND_API_KEY not configured. Email sending skipped. Set RESEND_API_KEY in .env.local to enable email sending.'
    )
    return { success: false, error: 'Email service not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'
  const appUrl = providedAppUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/register?token=${token}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Du wurdest zu Kniff eingeladen!',
      html: `
        <!DOCTYPE html>
        <html lang="de">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Einladung zu Kniff</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: #22c55e; margin: 0; font-size: 32px;">Kniff</h1>
            </div>

            <div style="background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1e293b; margin-top: 0;">Du wurdest eingeladen!</h2>

              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${invitedBy}</strong> hat dich zu Kniff eingeladen – der Online-Plattform für klassische deutsche Spiele.
              </p>

              <p style="font-size: 16px; margin-bottom: 30px;">
                Spiele in Echtzeit Kniffel, Poker, Blackjack, Roulette und mehr mit deinen Freunden!
              </p>

              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Jetzt registrieren
                </a>
              </div>

              <p style="font-size: 14px; color: #64748b; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                Oder kopiere diesen Link in deinen Browser:<br>
                <a href="${inviteUrl}" style="color: #22c55e; word-break: break-all;">${inviteUrl}</a>
              </p>

              <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                Diese Einladung ist 7 Tage gültig.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">Kniff – Spielen wie am Stammtisch, nur online.</p>
            </div>
          </body>
        </html>
      `,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send invite email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
