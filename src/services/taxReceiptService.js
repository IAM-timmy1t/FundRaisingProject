import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

class TaxReceiptService {
  constructor() {
    this.organizationInfo = {
      name: 'Blessed Horizon Foundation',
      registrationNumber: 'EIN: 87-1234567', // Example EIN
      address: {
        street: '123 Faith Street',
        city: 'Blessing',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      },
      email: 'receipts@blessed-horizon.org',
      phone: '+1 (555) 123-4567',
      website: 'https://blessed-horizon.org',
      taxExemptInfo: {
        us: '501(c)(3) tax-exempt organization',
        uk: 'Registered Charity No. 123456' // For GiftAid
      }
    };

    this.receiptTemplates = {
      us: 'us-tax-receipt',
      uk: 'uk-gift-aid-receipt',
      ca: 'ca-tax-receipt',
      default: 'standard-receipt'
    };
  }

  // Generate tax receipt for a donation
  async generateTaxReceipt(donationId, options = {}) {
    try {
      // Fetch donation details
      const donation = await this.getDonationDetails(donationId);
      
      if (!donation) {
        throw new Error('Donation not found');
      }

      // Determine receipt type based on donor country
      const receiptType = this.getReceiptType(donation.donor_country);
      
      // Generate PDF receipt
      const pdfBuffer = await this.createPDFReceipt(donation, receiptType, options);
      
      // Generate unique receipt number
      const receiptNumber = await this.generateReceiptNumber(donation);
      
      // Save receipt record
      const receiptRecord = await this.saveReceiptRecord({
        donation_id: donationId,
        receipt_number: receiptNumber,
        receipt_type: receiptType,
        generated_at: new Date().toISOString(),
        donor_id: donation.donor_id,
        amount: donation.amount,
        currency: donation.currency
      });

      // Upload to S3
      const receiptUrl = await this.uploadReceiptToS3(
        pdfBuffer, 
        receiptNumber,
        donation.donor_id
      );

      // Send receipt via email
      if (options.sendEmail !== false) {
        await this.sendReceiptEmail(donation, receiptUrl, receiptNumber);
      }

      return {
        receiptNumber,
        receiptUrl,
        receiptType,
        generated: true
      };
    } catch (error) {
      console.error('Error generating tax receipt:', error);
      throw error;
    }
  }

  // Get donation details with donor and campaign info
  async getDonationDetails(donationId) {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        user_profiles!donor_id (
          id,
          email,
          full_name,
          address,
          country
        ),
        campaigns (
          id,
          title,
          charity_registration
        )
      `)
      .eq('id', donationId)
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      donor_name: data.user_profiles.full_name,
      donor_email: data.user_profiles.email,
      donor_address: data.user_profiles.address,
      donor_country: data.user_profiles.country,
      campaign_title: data.campaigns.title,
      charity_registration: data.campaigns.charity_registration
    };
  }

  // Determine receipt type based on country
  getReceiptType(country) {
    const countryCode = country?.toLowerCase() || 'us';
    return this.receiptTemplates[countryCode] || this.receiptTemplates.default;
  }

  // Create PDF receipt
  async createPDFReceipt(donation, receiptType, options = {}) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add header with organization info
      this.addReceiptHeader(doc);

      // Add receipt title
      doc.fontSize(20)
        .text('OFFICIAL DONATION RECEIPT', { align: 'center' })
        .moveDown();

      // Add receipt details based on type
      switch (receiptType) {
        case 'us-tax-receipt':
          this.addUSTaxReceiptContent(doc, donation);
          break;
        case 'uk-gift-aid-receipt':
          this.addUKGiftAidContent(doc, donation);
          break;
        default:
          this.addStandardReceiptContent(doc, donation);
      }

      // Add QR code for verification
      this.addVerificationQR(doc, donation);

      // Add footer
      this.addReceiptFooter(doc, receiptType);

      doc.end();
    });
  }

  // Add receipt header with organization branding
  addReceiptHeader(doc) {
    // Add logo placeholder (in production, load actual logo)
    doc.rect(50, 50, 100, 50)
      .stroke()
      .text('LOGO', 75, 70);

    // Add organization info
    doc.fontSize(12)
      .text(this.organizationInfo.name, 200, 50)
      .fontSize(10)
      .text(this.organizationInfo.registrationNumber)
      .text(this.organizationInfo.address.street)
      .text(`${this.organizationInfo.address.city}, ${this.organizationInfo.address.state} ${this.organizationInfo.address.zipCode}`)
      .text(this.organizationInfo.email)
      .text(this.organizationInfo.phone)
      .moveDown(2);
  }

  // Add US tax receipt content
  addUSTaxReceiptContent(doc, donation) {
    const receiptDate = format(new Date(), 'MMMM d, yyyy');
    const donationDate = format(new Date(donation.created_at), 'MMMM d, yyyy');

    doc.fontSize(10)
      .text(`Receipt Date: ${receiptDate}`, { align: 'right' })
      .text(`Receipt #: ${donation.receipt_number}`, { align: 'right' })
      .moveDown();

    // Donor information
    doc.fontSize(12)
      .text('DONOR INFORMATION', { underline: true })
      .fontSize(10)
      .text(`Name: ${donation.donor_name}`)
      .text(`Address: ${donation.donor_address || 'On file'}`)
      .text(`Email: ${donation.donor_email}`)
      .moveDown();

    // Donation information
    doc.fontSize(12)
      .text('DONATION INFORMATION', { underline: true })
      .fontSize(10)
      .text(`Date of Donation: ${donationDate}`)
      .text(`Amount: $${donation.amount.toFixed(2)} ${donation.currency}`)
      .text(`Payment Method: ${donation.payment_method}`)
      .text(`Campaign: ${donation.campaign_title}`)
      .moveDown();

    // Tax deductibility statement
    doc.fontSize(11)
      .text('TAX DEDUCTIBILITY', { underline: true })
      .fontSize(10)
      .text(
        `${this.organizationInfo.name} is a ${this.organizationInfo.taxExemptInfo.us}. ` +
        'Your donation is tax-deductible to the extent allowed by law. ' +
        'No goods or services were provided in exchange for this donation.',
        { align: 'justify' }
      )
      .moveDown();

    // IRS required statement
    doc.fontSize(9)
      .text(
        'Please retain this receipt for your tax records. The amount listed above ' +
        'represents the full amount of your donation and is eligible for tax deduction ' +
        'under IRC Section 170.',
        { align: 'justify' }
      );
  }

  // Add UK Gift Aid content
  addUKGiftAidContent(doc, donation) {
    const receiptDate = format(new Date(), 'd MMMM yyyy');
    const donationDate = format(new Date(donation.created_at), 'd MMMM yyyy');

    doc.fontSize(10)
      .text(`Receipt Date: ${receiptDate}`, { align: 'right' })
      .text(`Receipt Reference: ${donation.receipt_number}`, { align: 'right' })
      .moveDown();

    // Donor details
    doc.fontSize(12)
      .text('DONOR DETAILS', { underline: true })
      .fontSize(10)
      .text(`Name: ${donation.donor_name}`)
      .text(`Address: ${donation.donor_address || 'On file'}`)
      .text(`Email: ${donation.donor_email}`)
      .moveDown();

    // Donation details
    doc.fontSize(12)
      .text('DONATION DETAILS', { underline: true })
      .fontSize(10)
      .text(`Date of Donation: ${donationDate}`)
      .text(`Amount: £${donation.amount.toFixed(2)}`)
      .text(`Campaign: ${donation.campaign_title}`)
      .moveDown();

    // Gift Aid declaration
    if (donation.gift_aid_eligible) {
      doc.fontSize(11)
        .text('GIFT AID DECLARATION', { underline: true })
        .fontSize(10)
        .text(
          'The donor has confirmed they are a UK taxpayer and understand that ' +
          'if they pay less Income Tax and/or Capital Gains Tax than the amount ' +
          'of Gift Aid claimed on all their donations in the tax year, it is their ' +
          'responsibility to pay any difference.',
          { align: 'justify' }
        )
        .moveDown()
        .text(`Gift Aid claimed: £${(donation.amount * 0.25).toFixed(2)}`)
        .moveDown();
    }

    // Charity information
    doc.fontSize(9)
      .text(`${this.organizationInfo.name} - ${this.organizationInfo.taxExemptInfo.uk}`)
      .text('Thank you for your generous donation.');
  }

  // Add standard receipt content
  addStandardReceiptContent(doc, donation) {
    const receiptDate = format(new Date(), 'yyyy-MM-dd');
    const donationDate = format(new Date(donation.created_at), 'yyyy-MM-dd');

    doc.fontSize(10)
      .text(`Receipt Date: ${receiptDate}`, { align: 'right' })
      .text(`Receipt Number: ${donation.receipt_number}`, { align: 'right' })
      .moveDown();

    // Donor information
    doc.fontSize(12)
      .text('DONOR INFORMATION', { underline: true })
      .fontSize(10)
      .text(`Name: ${donation.donor_name}`)
      .text(`Email: ${donation.donor_email}`)
      .moveDown();

    // Donation information
    doc.fontSize(12)
      .text('DONATION INFORMATION', { underline: true })
      .fontSize(10)
      .text(`Date: ${donationDate}`)
      .text(`Amount: ${donation.currency} ${donation.amount.toFixed(2)}`)
      .text(`Campaign: ${donation.campaign_title}`)
      .text(`Transaction ID: ${donation.transaction_id}`)
      .moveDown();

    // Thank you message
    doc.fontSize(11)
      .text('Thank you for your generous donation!', { align: 'center' })
      .moveDown()
      .fontSize(10)
      .text(
        'Your support helps us continue our mission of bringing hope and assistance ' +
        'to those in need. This receipt confirms your donation has been received.',
        { align: 'justify' }
      );
  }

  // Add QR code for receipt verification
  async addVerificationQR(doc, donation) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-receipt/${donation.receipt_number}`;
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 100,
        margin: 1
      });

      // Position QR code at bottom right
      doc.image(qrCodeDataUrl, 450, 700, { width: 100 });
      
      doc.fontSize(8)
        .text('Scan to verify', 450, 805, { width: 100, align: 'center' });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  // Add receipt footer
  addReceiptFooter(doc, receiptType) {
    const currentPage = doc.page;
    const pageHeight = currentPage.height - currentPage.margins.bottom;

    doc.fontSize(8)
      .text(
        '─────────────────────────────────────────────────────────',
        50, pageHeight - 60
      )
      .text(
        `This is an official receipt from ${this.organizationInfo.name}`,
        { align: 'center' }
      )
      .text(
        `${this.organizationInfo.website} | ${this.organizationInfo.email}`,
        { align: 'center' }
      );
  }

  // Generate unique receipt number
  async generateReceiptNumber(donation) {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('tax_receipts')
      .select('id', { count: 'exact' })
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`);

    const sequenceNumber = (count || 0) + 1;
    return `BH${year}${sequenceNumber.toString().padStart(6, '0')}`;
  }

  // Save receipt record to database
  async saveReceiptRecord(receiptData) {
    const { data, error } = await supabase
      .from('tax_receipts')
      .insert(receiptData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // Upload receipt to S3
  async uploadReceiptToS3(pdfBuffer, receiptNumber, donorId) {
    const key = `receipts/${donorId}/${receiptNumber}.pdf`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.RECEIPTS_BUCKET_NAME || 'blessed-horizon-receipts',
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        receiptNumber,
        donorId,
        generatedAt: new Date().toISOString()
      }
    });

    await s3Client.send(command);

    return `https://${process.env.RECEIPTS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }

  // Send receipt via email
  async sendReceiptEmail(donation, receiptUrl, receiptNumber) {
    // This would integrate with the email service
    // For now, we'll just log it
    console.log('Sending receipt email:', {
      to: donation.donor_email,
      subject: `Tax Receipt - ${receiptNumber}`,
      receiptUrl
    });

    // In production, integrate with emailService
    // await emailService.sendTaxReceipt(donation, receiptUrl, receiptNumber);
  }

  // Bulk generate receipts for a date range
  async bulkGenerateReceipts(startDate, endDate, options = {}) {
    const { data: donations, error } = await supabase
      .from('donations')
      .select('id')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'completed')
      .is('receipt_generated', false);

    if (error) {
      throw error;
    }

    const results = [];
    
    for (const donation of donations) {
      try {
        const receipt = await this.generateTaxReceipt(donation.id, {
          ...options,
          sendEmail: false // Don't send emails in bulk generation
        });
        
        results.push({
          donationId: donation.id,
          success: true,
          receipt
        });

        // Mark as generated
        await supabase
          .from('donations')
          .update({ receipt_generated: true })
          .eq('id', donation.id);
      } catch (error) {
        results.push({
          donationId: donation.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Get receipt by number
  async getReceiptByNumber(receiptNumber) {
    const { data, error } = await supabase
      .from('tax_receipts')
      .select('*')
      .eq('receipt_number', receiptNumber)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  // Verify receipt authenticity
  async verifyReceipt(receiptNumber) {
    const receipt = await this.getReceiptByNumber(receiptNumber);
    
    if (!receipt) {
      return {
        valid: false,
        message: 'Receipt not found'
      };
    }

    // Additional verification logic could be added here
    // For example, checking digital signatures

    return {
      valid: true,
      receipt,
      message: 'Receipt is valid and authentic'
    };
  }
}

export default new TaxReceiptService();
