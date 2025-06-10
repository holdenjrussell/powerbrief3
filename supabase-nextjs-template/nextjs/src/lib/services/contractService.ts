import { createSPAClient } from '@/lib/supabase/client';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { PdfSigningService, SignatureData } from './pdfSigningService';
import { 
  Contract, 
  ContractTemplate, 
  ContractRecipient, 
  ContractField,
  CreateContract,
  CreateContractTemplate,
  CreateContractRecipient,
  CreateContractField,
  ContractCreationData,
  SigningLinkData,
  ContractStatus,
  RecipientStatus,
  RecipientRole,
  CompletionCertificate,
  FieldType
} from '@/lib/types/contracts';
import { UgcCreator } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Utility function to auto-detect webapp URL from request context
function getWebappUrl(): string {
  // Try existing environment variables first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.NEXT_PUBLIC_WEBAPP_URL) {
    return process.env.NEXT_PUBLIC_WEBAPP_URL;
  }
  
  // Auto-detect based on deployment environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Smart defaults based on environment
  if (process.env.NODE_ENV === 'production') {
    return 'https://app.powerbrief.ai'; // Production default
  }
  
  return 'http://localhost:3000'; // Development default
}

export class ContractService {
  private static instance: ContractService;
  private pdfService: PdfSigningService;

  private constructor() {
    this.pdfService = PdfSigningService.getInstance();
  }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Create a new contract template
   */
  async createTemplate(
    templateData: CreateContractTemplate,
    brandId: string,
    userId: string
  ): Promise<ContractTemplate> {
    console.log('[ContractService.createTemplate] === TEMPLATE CREATION DEBUGGING ===');
    console.log('[ContractService.createTemplate] Received templateData:', {
      title: templateData.title,
      description: templateData.description,
      document_name: templateData.document_name,
      document_size: templateData.document_data.length,
      fieldsCount: templateData.fields?.length || 0,
      fields: templateData.fields
    });
    console.log('[ContractService.createTemplate] Individual fields:');
    (templateData.fields || []).forEach((field, index) => {
      console.log(`[ContractService.createTemplate] Field ${index}:`, field);
    });
    
    const supabase = await createServerAdminClient();

    // Validate PDF
    const validation = await this.pdfService.validatePdf(templateData.document_data);
    if (!validation.isValid) {
      throw new Error(`Invalid PDF: ${validation.error}`);
    }

    // Convert Uint8Array to Buffer for Supabase
    const documentDataBuffer = Buffer.from(templateData.document_data);

    const template = {
      title: templateData.title,
      description: templateData.description,
      document_data: documentDataBuffer as any,
      document_name: templateData.document_name,
      document_size: templateData.document_data.length,
      // Remove fields from template - they go in separate table now
      user_id: userId,
      brand_id: brandId,
    };

    console.log('[ContractService.createTemplate] Template object before DB insert (no fields):', {
      title: template.title,
      description: template.description,
      document_name: template.document_name,
      document_size: template.document_size,
      user_id: template.user_id,
      brand_id: template.brand_id
    });

    const { data, error } = await supabase
      .from('contract_templates')
      .insert(template)
      .select()
      .single();

    if (error) {
      console.error('[ContractService.createTemplate] Database insert error:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }

    console.log('[ContractService.createTemplate] Template successfully created in database:', {
      id: data.id,
      title: data.title
    });

    // Now save template fields to separate table
    if (templateData.fields && templateData.fields.length > 0) {
      console.log('[ContractService.createTemplate] Saving template fields to contract_template_fields table...');
      
      const templateFields = templateData.fields.map(field => ({
        template_id: data.id,
        type: field.type,
        page: field.page,
        position_x: field.positionX,
        position_y: field.positionY,
        width: field.width,
        height: field.height,
        recipient_role: 'signer', // Default for templates
        is_required: true,
        placeholder: `${field.type} field`,
      }));

      console.log('[ContractService.createTemplate] Template fields to insert:', templateFields);

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('contract_template_fields')
        .insert(templateFields)
        .select();

      if (fieldsError) {
        console.error('[ContractService.createTemplate] Template fields insert error:', fieldsError);
        throw new Error(`Failed to save template fields: ${fieldsError.message}`);
      }

      console.log('[ContractService.createTemplate] Template fields saved successfully:', fieldsData);
    } else {
      console.log('[ContractService.createTemplate] No fields to save');
    }

    return data;
  }

  /**
   * Get contract templates for a brand
   */
  async getTemplates(brandId: string, userId: string): Promise<ContractTemplate[]> {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new contract from template or upload
   */
  async createContract(
    contractData: ContractCreationData,
    documentData: Uint8Array,
    documentName: string,
    brandId: string,
    userId: string
  ): Promise<Contract> {
    const supabase = await createServerAdminClient();

    // Validate PDF
    const validation = await this.pdfService.validatePdf(documentData);
    if (!validation.isValid) {
      throw new Error(`Invalid PDF: ${validation.error}`);
    }

    // Generate share token for public access
    const shareToken = this.generateShareToken();

    // Calculate expiration date
    const expiresAt = contractData.expiresInDays 
      ? new Date(Date.now() + contractData.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Convert Uint8Array to Buffer for Supabase
    // Supabase will handle the bytea conversion automatically
    const documentDataBuffer = Buffer.from(documentData);

    // Create contract
    const contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'> = {
      template_id: contractData.templateId || null,
      user_id: userId,
      brand_id: brandId,
      creator_id: contractData.creatorId || null,
      script_id: contractData.scriptId || null,
      title: contractData.title,
      status: 'draft',
      document_data: documentDataBuffer as any, // Let Supabase handle bytea conversion
      document_name: documentName,
      document_size: documentData.length, // Original length is fine for metadata
      signed_document_data: null,
      completion_certificate: null,
      share_token: shareToken,
      expires_at: expiresAt,
      completed_at: null,
    };

    const { data: contractResult, error: contractError } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();

    if (contractError) {
      throw new Error(`Failed to create contract: ${contractError.message}`);
    }

    // Create recipients
    const recipients: CreateContractRecipient[] = contractData.recipients.map((recipient, index) => ({
      name: recipient.name,
      email: recipient.email,
      role: recipient.role || 'signer',
      signing_order: index + 1,
    }));

    const recipientResults = await this.createContractRecipients(contractResult.id, recipients);

    // Create fields from contractData if provided, otherwise create default signature fields
    let fields: CreateContractField[] = [];
    
    if (contractData.fields && contractData.fields.length > 0) {
      // Use fields from editor
      console.log('Using fields from editor:', contractData.fields);
      
      // Create a mapping from recipientEmail to recipient_id
      const recipientEmailToId = recipientResults.reduce((map, recipient) => {
        map[recipient.email] = recipient.id;
        return map;
      }, {} as Record<string, string>);
      
      fields = contractData.fields.map(field => ({
        recipient_id: recipientEmailToId[field.recipientEmail] || recipientResults[0].id, // Fallback to first recipient
        type: field.type as FieldType,
        page: field.page,
        position_x: field.positionX,
        position_y: field.positionY,
        width: field.width,
        height: field.height,
        is_required: true,
        placeholder: `${field.type} field`,
      }));
    } else {
      // Create default signature fields for each signer (fallback behavior)
      console.log('No fields provided, creating default signature fields');
      fields = recipientResults
        .filter(r => r.role === 'signer')
        .map((recipient, index) => ({
          recipient_id: recipient.id,
          type: 'signature' as const,
          page: 1,
          position_x: 0.1,
          position_y: 0.8 - (index * 0.1), // Stack signatures vertically
          width: 0.3,
          height: 0.08,
          is_required: true,
          placeholder: `Signature - ${recipient.name}`,
        }));
    }

    if (fields.length > 0) {
      await this.createContractFields(contractResult.id, fields);
    }

    // Log contract creation
    await this.logAuditAction(contractResult.id, null, 'created', {
      contract_title: contractData.title,
      recipient_count: recipients.length,
    });

    // Keep contract in draft status - it should only be sent when explicitly requested
    // The contract will be updated to 'sent' status when the sendContract method is called

    return contractResult;
  }

  /**
   * Send contract to recipients
   */
  async sendContract(contractId: string, userId: string): Promise<void> {
    const supabase = await createServerAdminClient();

    // Get contract with recipients
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*)
      `)
      .eq('id', contractId)
      .eq('user_id', userId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== 'draft') {
      throw new Error('Contract is not in draft status');
    }

    // Get brand information for email
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', contract.brand_id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found');
    }

    // Generate auth tokens for recipients and send emails
    const recipients = contract.recipients as ContractRecipient[];
    const signers = recipients.filter(r => r.role === 'signer').sort((a, b) => a.signing_order - b.signing_order);

    for (const recipient of signers) {
      const authToken = this.generateAuthToken();
      
      // Update recipient with auth token and status
      await supabase
        .from('contract_recipients')
        .update({
          auth_token: authToken,
          status: 'sent'
        })
        .eq('id', recipient.id);

      // Send signing email
      await this.sendSigningEmail(
        contract,
        recipient,
        authToken,
        brand.name,
        brand.email_identifier
      );

      // Log email sent
      await this.logAuditAction(contractId, recipient.id, 'sent', {
        recipient_email: recipient.email,
        auth_token: authToken.substring(0, 8) + '...',
      });
    }

    // Update contract status
    await supabase
      .from('contracts')
      .update({ status: 'sent' })
      .eq('id', contractId);

    // Update UGC creator contract status if linked
    if (contract.creator_id) {
      await supabase
        .from('ugc_creators')
        .update({ contract_status: 'contract sent' })
        .eq('id', contract.creator_id);
    }
  }

  /**
   * Get signing link data for a recipient
   */
  async getSigningLink(contractId: string, authToken: string): Promise<SigningLinkData | null> {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('contract_recipients')
      .select(`
        *,
        contract:contracts(*)
      `)
      .eq('contract_id', contractId)
      .eq('auth_token', authToken)
      .single();

    if (error || !data) {
      return null;
    }

    const contract = data.contract as Contract;
    
    return {
      contractId: contract.id,
      recipientId: data.id,
      authToken: data.auth_token!,
      contractTitle: contract.title,
      signerName: data.name,
      signerEmail: data.email,
      expiresAt: contract.expires_at || undefined,
    };
  }

  /**
   * Submit signature for a contract field
   */
  async submitSignature(
    contractId: string,
    recipientId: string,
    authToken: string,
    signatures: { fieldId: string; value: string; type: string }[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const supabase = await createServerAdminClient();

    // Verify recipient auth
    const { data: recipient, error: recipientError } = await supabase
      .from('contract_recipients')
      .select('*')
      .eq('id', recipientId)
      .eq('contract_id', contractId)
      .eq('auth_token', authToken)
      .single();

    if (recipientError || !recipient) {
      throw new Error('Invalid signing link');
    }

    // Update signature fields
    const signedAt = new Date().toISOString();
    
    for (const signature of signatures) {
      await supabase
        .from('contract_fields')
        .update({
          value: signature.value,
          updated_at: signedAt
        })
        .eq('id', signature.fieldId)
        .eq('recipient_id', recipientId);
    }

    // Update recipient status
    await supabase
      .from('contract_recipients')
      .update({
        status: 'signed',
        signed_at: signedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .eq('id', recipientId);

    // Log signing action
    await this.logAuditAction(contractId, recipientId, 'signed', {
      field_count: signatures.length,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Check if all signers have signed
    await this.checkContractCompletion(contractId);
  }

  /**
   * Check if contract is complete and generate final signed document
   */
  private async checkContractCompletion(contractId: string): Promise<void> {
    const supabase = await createServerAdminClient();

    // Get all signers for this contract
    const { data: signers, error: signersError } = await supabase
      .from('contract_recipients')
      .select('*')
      .eq('contract_id', contractId)
      .eq('role', 'signer');

    if (signersError) {
      throw new Error(`Failed to check signers: ${signersError.message}`);
    }

    // Check if all signers have signed
    const allSigned = signers.every(signer => signer.status === 'signed');
    
    if (!allSigned) {
      // Update status to partially_signed if some have signed
      const anySigned = signers.some(signer => signer.status === 'signed');
      if (anySigned) {
        await supabase
          .from('contracts')
          .update({ status: 'partially_signed' })
          .eq('id', contractId);
      }
      return;
    }

    // All signers have signed - generate final document
    await this.generateFinalSignedDocument(contractId);
  }

  /**
   * Generate the final signed document with all signatures
   */
  private async generateFinalSignedDocument(contractId: string): Promise<void> {
    const supabase = await createServerAdminClient();

    // Get contract with all related data
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*),
        fields:contract_fields(*)
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // Prepare signature data for PDF service
    const signatureData: SignatureData[] = (contract.fields as ContractField[])
      .filter(field => field.value)
      .map(field => {
        const recipient = (contract.recipients as ContractRecipient[])
          .find(r => r.id === field.recipient_id);
        
        return {
          fieldId: field.id,
          type: field.type,
          value: field.value!,
          signedAt: recipient?.signed_at || new Date().toISOString(),
          signerName: recipient?.name || 'Unknown',
          signerEmail: recipient?.email || 'unknown@example.com',
          ipAddress: recipient?.ip_address || undefined,
          userAgent: recipient?.user_agent || undefined,
        };
      });

    // Generate signed PDF
    const signingResult = await this.pdfService.signPdf(
      contract.document_data,
      signatureData,
      contractId,
      contract.title
    );

    // Update contract with signed document and completion data
    const completedAt = new Date().toISOString();
    
    await supabase
      .from('contracts')
      .update({
        status: 'completed',
        signed_document_data: signingResult.signedPdfBytes,
        completion_certificate: signingResult.certificate,
        completed_at: completedAt,
      })
      .eq('id', contractId);

    // Log completion
    await this.logAuditAction(contractId, null, 'completed', {
      security_hash: signingResult.securityHash,
      signer_count: signatureData.length,
    });

    // Update UGC creator contract status if linked
    if (contract.creator_id) {
      await supabase
        .from('ugc_creators')
        .update({ contract_status: 'contract signed' })
        .eq('id', contract.creator_id);
    }

    // Send completion emails to all participants
    await this.sendCompletionEmails(contractId);
  }

  /**
   * Send completion emails to all contract participants
   */
  private async sendCompletionEmails(contractId: string): Promise<void> {
    const supabase = await createServerAdminClient();

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*)
      `)
      .eq('id', contractId)
      .single();

    if (error || !contract) {
      return;
    }

    const recipients = contract.recipients as ContractRecipient[];
    
    // Get brand for email configuration
    const { data: brand } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', contract.brand_id)
      .single();

    if (!brand?.email_identifier) {
      console.warn('Brand email identifier not configured for completion emails');
      return;
    }

    // Send completion email to each recipient
    for (const recipient of recipients) {
      try {
        await this.sendCompletionEmail(contract, recipient, brand.name, brand.email_identifier);
      } catch (error) {
        console.error(`Failed to send completion email to ${recipient.email}:`, error);
      }
    }
  }

  /**
   * Get contracts for a brand
   */
  async getContracts(
    brandId: string, 
    userId: string, 
    status?: ContractStatus
  ): Promise<Contract[]> {
    const supabase = await createServerAdminClient();

    let query = supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*),
        template:contract_templates(title)
      `)
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch contracts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get contract by ID with full details
   */
  async getContract(contractId: string, userId?: string): Promise<Contract | null> {
    const supabase = await createServerAdminClient();

    let query = supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*),
        fields:contract_fields(*),
        audit_logs:contract_audit_logs(*),
        template:contract_templates(title, description)
      `)
      .eq('id', contractId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get contract by share token (public access)
   */
  async getContractByShareToken(shareToken: string): Promise<Contract | null> {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*),
        fields:contract_fields(*)
      `)
      .eq('share_token', shareToken)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Create contract recipients
   */
  private async createContractRecipients(
    contractId: string,
    recipients: CreateContractRecipient[]
  ): Promise<ContractRecipient[]> {
    const supabase = await createServerAdminClient();

    const recipientsWithContractId = recipients.map(recipient => ({
      ...recipient,
      contract_id: contractId,
    }));

    const { data, error } = await supabase
      .from('contract_recipients')
      .insert(recipientsWithContractId)
      .select();

    if (error) {
      throw new Error(`Failed to create recipients: ${error.message}`);
    }

    return data;
  }

  /**
   * Create contract fields
   */
  private async createContractFields(
    contractId: string,
    fields: CreateContractField[]
  ): Promise<ContractField[]> {
    const supabase = await createServerAdminClient();

    const fieldsWithContractId = fields.map(field => ({
      ...field,
      contract_id: contractId,
    }));

    const { data, error } = await supabase
      .from('contract_fields')
      .insert(fieldsWithContractId)
      .select();

    if (error) {
      throw new Error(`Failed to create fields: ${error.message}`);
    }

    return data;
  }

  /**
   * Log audit action
   */
  private async logAuditAction(
    contractId: string,
    recipientId: string | null,
    action: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const supabase = await createServerAdminClient();

    await supabase
      .from('contract_audit_logs')
      .insert({
        contract_id: contractId,
        recipient_id: recipientId,
        action,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
  }

  /**
   * Send signing email to recipient
   */
  private async sendSigningEmail(
    contract: Contract,
    recipient: ContractRecipient,
    authToken: string,
    brandName: string,
    emailIdentifier?: string | null
  ): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid not configured - signing email would be sent in production');
      return;
    }

    const signingUrl = `${getWebappUrl()}/public/contracts/sign/${contract.id}?token=${authToken}`;
    
    // Use verified sender and brand-specific reply-to
    const fromEmail = 'noreply@powerbrief.ai';
    const replyToEmail = emailIdentifier 
      ? `${emailIdentifier}@mail.powerbrief.ai`
      : 'noreply@powerbrief.ai';

    const emailContent = this.generateSigningEmailContent(
      contract,
      recipient,
      signingUrl,
      brandName
    );

    const msg = {
      to: recipient.email,
      from: {
        email: fromEmail,
        name: brandName
      },
      replyTo: {
        email: replyToEmail,
        name: brandName
      },
      subject: `Contract Ready for Signature: ${contract.title}`,
      html: emailContent.html,
      text: emailContent.text,
    };

    await sgMail.send(msg);
  }

  /**
   * Send completion email
   */
  private async sendCompletionEmail(
    contract: Contract,
    recipient: ContractRecipient,
    brandName: string,
    emailIdentifier?: string | null
  ): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid not configured - completion email would be sent in production');
      return;
    }

    // Use verified sender and brand-specific reply-to
    const fromEmail = 'noreply@powerbrief.ai';
    const replyToEmail = emailIdentifier 
      ? `${emailIdentifier}@mail.powerbrief.ai`
      : 'noreply@powerbrief.ai';

    const emailContent = this.generateCompletionEmailContent(contract, recipient, brandName);

    const msg = {
      to: recipient.email,
      from: {
        email: fromEmail,
        name: brandName
      },
      replyTo: {
        email: replyToEmail,
        name: brandName
      },
      subject: `Contract Completed: ${contract.title}`,
      html: emailContent.html,
      text: emailContent.text,
    };

    await sgMail.send(msg);
  }

  /**
   * Generate signing email content
   */
  private generateSigningEmailContent(
    contract: Contract,
    recipient: ContractRecipient,
    signingUrl: string,
    brandName: string
  ): { html: string; text: string } {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Contract Ready for Your Signature</h2>
        <p>Hello ${recipient.name},</p>
        <p>You have been invited to sign the contract: <strong>${contract.title}</strong></p>
        <p>Please click the button below to review and sign the document:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review & Sign Contract
          </a>
        </div>
        <p><strong>Important:</strong> This link is secure and personalized for you. Please do not share it with others.</p>
        ${contract.expires_at ? `<p><strong>Deadline:</strong> Please sign before ${new Date(contract.expires_at).toLocaleDateString()}</p>` : ''}
        <p>If you have any questions about this contract, please contact ${brandName}.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${brandName} via PowerBrief Contract System.<br>
          If you cannot click the button above, copy and paste this link into your browser:<br>
          ${signingUrl}
        </p>
      </div>
    `;

    const text = `
Contract Ready for Your Signature

Hello ${recipient.name},

You have been invited to sign the contract: ${contract.title}

Please visit the following link to review and sign the document:
${signingUrl}

Important: This link is secure and personalized for you. Please do not share it with others.

${contract.expires_at ? `Deadline: Please sign before ${new Date(contract.expires_at).toLocaleDateString()}\n` : ''}
If you have any questions about this contract, please contact ${brandName}.

---
This email was sent by ${brandName} via PowerBrief Contract System.
    `.trim();

    return { html, text };
  }

  /**
   * Generate completion email content
   */
  private generateCompletionEmailContent(
    contract: Contract,
    recipient: ContractRecipient,
    brandName: string
  ): { html: string; text: string } {
    // Construct download URL with smart defaults
    const baseUrl = getWebappUrl();
    const downloadUrl = `${baseUrl}/public/contracts/download/${contract.id}?token=${contract.share_token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>✅ Contract Completed</h2>
        <p>Hello ${recipient.name},</p>
        <p>Great news! The contract <strong>${contract.title}</strong> has been completed.</p>
        <p>All required signatures have been collected and the document is now legally binding.</p>
        <p><strong>Completed on:</strong> ${contract.completed_at ? new Date(contract.completed_at).toLocaleDateString() : 'N/A'}</p>
        <p>You can download a copy of the completed contract using the secure link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Completed Contract
          </a>
        </div>
        <p>Thank you for your participation in this contract signing process.</p>
        <p>Best regards,<br>${brandName}</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${brandName} via PowerBrief Contract System.
        </p>
      </div>
    `;

    const text = `
Contract Completed

Hello ${recipient.name},

Great news! The contract "${contract.title}" has been completed.

All required signatures have been collected and the document is now legally binding.

Completed on: ${contract.completed_at ? new Date(contract.completed_at).toLocaleDateString() : 'N/A'}

You can download a copy of the completed contract using this link:
${downloadUrl}

Thank you for your participation in this contract signing process.

Best regards,
${brandName}

---
This email was sent by ${brandName} via PowerBrief Contract System.
    `.trim();

    return { html, text };
  }

  /**
   * Generate secure share token
   */
  private generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure auth token
   */
  private generateAuthToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Update creator contract status when contract is linked
   */
  async updateCreatorContractStatus(
    creatorId: string,
    status: 'not signed' | 'contract sent' | 'contract signed'
  ): Promise<void> {
    const supabase = await createServerAdminClient();

    await supabase
      .from('ugc_creators')
      .update({ contract_status: status })
      .eq('id', creatorId);
  }

  /**
   * Get contracts for a specific creator
   */
  async getCreatorContracts(creatorId: string): Promise<Contract[]> {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*)
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch creator contracts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get contracts for a specific script
   */
  async getScriptContracts(scriptId: string): Promise<Contract[]> {
    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*)
      `)
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch script contracts: ${error.message}`);
    }

    return data || [];
  }
} 