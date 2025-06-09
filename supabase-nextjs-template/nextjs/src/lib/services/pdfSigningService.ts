import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { FieldType, CompletionCertificate } from '@/lib/types/contracts';
import * as crypto from 'crypto';

export interface SignatureData {
  fieldId: string;
  type: FieldType;
  value: string;
  signedAt: string;
  signerName: string;
  signerEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PdfSigningResult {
  signedPdfBytes: Uint8Array;
  certificate: CompletionCertificate;
  securityHash: string;
}

export class PdfSigningService {
  private static instance: PdfSigningService;

  public static getInstance(): PdfSigningService {
    if (!PdfSigningService.instance) {
      PdfSigningService.instance = new PdfSigningService();
    }
    return PdfSigningService.instance;
  }

  /**
   * Apply signatures and other field values to a PDF document
   */
  async signPdf(
    originalPdfBytes: Uint8Array,
    signatures: SignatureData[],
    contractId: string,
    contractTitle: string
  ): Promise<PdfSigningResult> {
    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      
      // Get fonts for text rendering
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Apply each signature/field value to the PDF
      for (const signature of signatures) {
        await this.applyFieldToPdf(
          pdfDoc,
          pages,
          signature,
          helveticaFont,
          helveticaBoldFont
        );
      }

      // Add completion metadata to the PDF
      await this.addCompletionMetadata(pdfDoc, contractId, contractTitle, signatures);

      // Generate the final signed PDF
      const signedPdfBytes = await pdfDoc.save();

      // Generate completion certificate
      const certificate = this.generateCompletionCertificate(
        contractId,
        contractTitle,
        signatures
      );

      // Generate security hash
      const securityHash = this.generateSecurityHash(signedPdfBytes, signatures);

      return {
        signedPdfBytes,
        certificate,
        securityHash
      };
    } catch (error) {
      console.error('Error signing PDF:', error);
      throw new Error(`Failed to sign PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply a single field (signature, text, etc.) to the PDF
   */
  private async applyFieldToPdf(
    pdfDoc: PDFDocument,
    pages: PDFPage[],
    signature: SignatureData,
    helveticaFont: PDFFont,
    helveticaBoldFont: PDFFont
  ): Promise<void> {
    // Note: In a real implementation, you would get the field position from the contract_fields table
    // For now, we'll assume the field positions are stored in a standardized way
    
    // This is a simplified implementation - in practice, you'd store and retrieve
    // the exact field coordinates from your database
    const pageIndex = 0; // This would come from the field data
    const page = pages[pageIndex];
    
    if (!page) {
      console.warn(`Page ${pageIndex} not found for field ${signature.fieldId}`);
      return;
    }

    const { width, height } = page.getSize();
    
    // Default position - in practice this would come from stored field coordinates
    const x = width * 0.1; // 10% from left
    const y = height * 0.2; // 20% from bottom

    switch (signature.type) {
      case 'signature':
        await this.drawSignature(page, signature, x, y, helveticaBoldFont);
        break;
      case 'date':
        await this.drawDate(page, signature, x, y, helveticaFont);
        break;
      case 'text':
        await this.drawText(page, signature, x, y, helveticaFont);
        break;
      case 'checkbox':
        await this.drawCheckbox(page, signature, x, y);
        break;
      case 'initial':
        await this.drawInitial(page, signature, x, y, helveticaBoldFont);
        break;
    }
  }

  /**
   * Draw a signature on the PDF page
   */
  private async drawSignature(
    page: PDFPage,
    signature: SignatureData,
    x: number,
    y: number,
    font: PDFFont
  ): Promise<void> {
    // For digital signatures, we'll render the signer's name in a signature style
    const signatureText = signature.value || signature.signerName;
    
    page.drawText(signatureText, {
      x,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0.8), // Blue color for digital signature
    });

    // Add a line underneath to indicate it's a signature
    page.drawLine({
      start: { x, y: y - 2 },
      end: { x: x + 150, y: y - 2 },
      thickness: 1,
      color: rgb(0, 0, 0.8),
    });

    // Add signature timestamp
    const signedDate = new Date(signature.signedAt).toLocaleDateString();
    page.drawText(`Signed on: ${signedDate}`, {
      x,
      y: y - 20,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  /**
   * Draw a date field on the PDF page
   */
  private async drawDate(
    page: PDFPage,
    signature: SignatureData,
    x: number,
    y: number,
    font: PDFFont
  ): Promise<void> {
    const dateValue = signature.value || new Date().toLocaleDateString();
    
    page.drawText(dateValue, {
      x,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Draw a text field on the PDF page
   */
  private async drawText(
    page: PDFPage,
    signature: SignatureData,
    x: number,
    y: number,
    font: PDFFont
  ): Promise<void> {
    page.drawText(signature.value, {
      x,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Draw a checkbox on the PDF page
   */
  private async drawCheckbox(
    page: PDFPage,
    signature: SignatureData,
    x: number,
    y: number
  ): Promise<void> {
    const isChecked = signature.value === 'true' || signature.value === 'checked';
    
    // Draw checkbox border
    page.drawRectangle({
      x,
      y,
      width: 12,
      height: 12,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Draw checkmark if checked
    if (isChecked) {
      page.drawText('✓', {
        x: x + 2,
        y: y + 2,
        size: 10,
        color: rgb(0, 0.6, 0),
      });
    }
  }

  /**
   * Draw initials on the PDF page
   */
  private async drawInitial(
    page: PDFPage,
    signature: SignatureData,
    x: number,
    y: number,
    font: PDFFont
  ): Promise<void> {
    const initials = signature.value || this.generateInitials(signature.signerName);
    
    page.drawText(initials, {
      x,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0.8),
    });
  }

  /**
   * Add completion metadata to the PDF
   */
  private async addCompletionMetadata(
    pdfDoc: PDFDocument,
    contractId: string,
    contractTitle: string,
    signatures: SignatureData[]
  ): Promise<void> {
    // Set PDF metadata
    pdfDoc.setTitle(`${contractTitle} - Completed`);
    pdfDoc.setSubject('Digitally Signed Contract');
    pdfDoc.setCreator('PowerBrief Contract System');
    pdfDoc.setProducer('PowerBrief PDF Signing Service');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    // Store metadata as PDF custom properties (if supported by pdf-lib)
    try {
      pdfDoc.setKeywords([
        `contract_id:${contractId}`,
        `signed_at:${new Date().toISOString()}`,
        `signers:${signatures.length}`
      ]);
    } catch (error) {
      console.warn('Could not set PDF keywords:', error);
    }
  }

  /**
   * Generate a completion certificate
   */
  private generateCompletionCertificate(
    contractId: string,
    contractTitle: string,
    signatures: SignatureData[]
  ): CompletionCertificate {
    const completedAt = new Date().toISOString();
    
    return {
      contract_id: contractId,
      completed_at: completedAt,
      recipients: signatures.map(sig => ({
        name: sig.signerName,
        email: sig.signerEmail,
        signed_at: sig.signedAt,
        ip_address: sig.ipAddress,
        user_agent: sig.userAgent,
      })),
      audit_trail: signatures.map(sig => ({
        action: 'signed',
        timestamp: sig.signedAt,
        details: {
          field_id: sig.fieldId,
          field_type: sig.type,
          signer_name: sig.signerName,
          signer_email: sig.signerEmail,
          ip_address: sig.ipAddress,
        },
      })),
      security_hash: this.generateSecurityHash(new Uint8Array(), signatures),
    };
  }

  /**
   * Generate a security hash for the signed document
   */
  private generateSecurityHash(pdfBytes: Uint8Array, signatures: SignatureData[]): string {
    const hasher = crypto.createHash('sha256');
    
    // Hash the PDF content
    hasher.update(pdfBytes);
    
    // Hash signature data
    signatures.forEach(sig => {
      hasher.update(JSON.stringify({
        fieldId: sig.fieldId,
        value: sig.value,
        signedAt: sig.signedAt,
        signerEmail: sig.signerEmail,
      }));
    });
    
    return hasher.digest('hex');
  }

  /**
   * Hash individual signature data
   */
  private hashSignature(signature: SignatureData): string {
    const hasher = crypto.createHash('sha256');
    hasher.update(JSON.stringify({
      fieldId: signature.fieldId,
      value: signature.value,
      signedAt: signature.signedAt,
      signerEmail: signature.signerEmail,
    }));
    return hasher.digest('hex');
  }

  /**
   * Generate initials from a full name
   */
  private generateInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Validate PDF document
   */
  async validatePdf(pdfBytes: Uint8Array): Promise<{ isValid: boolean; error?: string }> {
    try {
      await PDFDocument.load(pdfBytes);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid PDF document'
      };
    }
  }

  /**
   * Get PDF page count
   */
  async getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return pdfDoc.getPageCount();
    } catch (error) {
      throw new Error(`Failed to get PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract PDF metadata
   */
  async getPdfMetadata(pdfBytes: Uint8Array): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    pageCount: number;
    size: number;
  }> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      return {
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        subject: pdfDoc.getSubject() || undefined,
        pageCount: pdfDoc.getPageCount(),
        size: pdfBytes.length,
      };
    } catch (error) {
      throw new Error(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 