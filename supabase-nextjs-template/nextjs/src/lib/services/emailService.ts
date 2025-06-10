interface ContractCompletionEmailData {
  contractId: string;
  contractTitle: string;
  recipientName: string;
  recipientEmail: string;
  downloadUrl?: string;
}

export class EmailService {
  /**
   * Send contract completion confirmation email
   */
  static async sendContractCompletionEmail(data: ContractCompletionEmailData): Promise<void> {
    try {
      // For now, just log the email that would be sent
      // In production, you'd integrate with SendGrid, AWS SES, etc.
      console.log('[EmailService] Contract completion email would be sent:');
      console.log({
        to: data.recipientEmail,
        subject: `Contract Signed: ${data.contractTitle}`,
        message: `
Dear ${data.recipientName},

Thank you for signing the contract "${data.contractTitle}".

Your contract has been successfully completed and a copy has been generated.

${data.downloadUrl ? `You can download your signed copy here: ${data.downloadUrl}` : 'A copy will be provided to you shortly.'}

Thank you for using PowerBrief Contract System.

Best regards,
PowerBrief Team
        `,
        contractId: data.contractId,
        timestamp: new Date().toISOString()
      });

      // TODO: Replace with actual email service integration
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: data.recipientEmail,
      //   from: 'noreply@powerbrief.com',
      //   subject: `Contract Signed: ${data.contractTitle}`,
      //   html: emailHtml
      // });

      console.log(`[EmailService] Email confirmation logged for ${data.recipientEmail}`);
    } catch (error) {
      console.error('[EmailService] Error sending contract completion email:', error);
      // Don't throw - email failure shouldn't block contract completion
    }
  }

  /**
   * Send contract invitation email
   */
  static async sendContractInvitationEmail(
    recipientEmail: string,
    recipientName: string,
    contractTitle: string,
    signingUrl: string
  ): Promise<void> {
    try {
      console.log('[EmailService] Contract invitation email would be sent:');
      console.log({
        to: recipientEmail,
        subject: `Please sign: ${contractTitle}`,
        message: `
Dear ${recipientName},

You have been invited to sign a contract: "${contractTitle}".

Please click the link below to review and sign the contract:
${signingUrl}

This link is secure and unique to you.

Best regards,
PowerBrief Team
        `,
        timestamp: new Date().toISOString()
      });

      console.log(`[EmailService] Invitation email logged for ${recipientEmail}`);
    } catch (error) {
      console.error('[EmailService] Error sending contract invitation email:', error);
      // Don't throw - email failure shouldn't block contract creation
    }
  }
} 