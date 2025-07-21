// Documentation Service
// In production, this would fetch from the server
// For now, we'll include some sample content

const documentationContent = {
  'getting-started/creating-account.md': `# Creating Your Account

Welcome to Blessed Horizon! This guide will help you create and verify your account.

## Quick Start

1. Visit [www.blessedhorizon.org](/)
2. Click **"Sign Up"** in the top right
3. Complete the registration form
4. Verify your email
5. Complete your profile

## Step-by-Step Guide

### Step 1: Navigate to Sign Up
Click the **"Sign Up"** button in the navigation bar or the **"Get Started"** button on the homepage.

### Step 2: Fill in Your Information

**Email Address**
- Use a valid email you check regularly
- This will be your login username

**Password**
- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character

**Full Name**
- Enter your legal name for verification

### Step 3: Email Verification
1. Check your inbox for our verification email
2. Click the verification link
3. Link expires in 24 hours

### Step 4: Complete Your Profile
Add a profile photo and bio to build trust with donors.

## Need Help?
Contact support@blessedhorizon.org if you have any issues.`,

  'campaigns/create-campaign.md': `# Creating a Campaign

Learn how to create a successful fundraising campaign on Blessed Horizon.

## Prerequisites
- Verified account
- Campaign details ready
- Bank account for withdrawals

## Step-by-Step Process

### 1. Access Campaign Creation
From your dashboard, click **"Create Campaign"**

### 2. Basic Information
- **Title**: Clear and compelling (max 60 characters)
- **Description**: Tell your story in detail
- **Goal Amount**: Set a realistic target
- **Duration**: Default 30 days, max 90 days

### 3. Media
- Main image: 1200x630px recommended
- Additional photos/videos supported
- Show your cause clearly

### 4. Verification
Submit documents for approval:
- Personal ID
- Supporting documents
- Proof of need

### 5. Review and Publish
- Preview your campaign
- Submit for approval
- Typical approval: 24-48 hours

## Best Practices
- Be authentic and honest
- Use specific details
- Update regularly
- Engage with donors

## Questions?
Visit our [FAQ](/faq) or contact support.`,

  'donations/making-donations.md': `# Making Donations

Thank you for your generosity! Here's how to make secure donations.

## Quick Process
1. Find a campaign
2. Click "Donate Now"
3. Enter amount
4. Complete payment
5. Receive confirmation

## Payment Methods
- Credit/Debit Cards
- Apple Pay & Google Pay
- Bank Transfer (ACH)
- International cards supported

## Donation Options
- **One-time**: Single payment
- **Recurring**: Monthly support
- **Anonymous**: Hide your name
- **Dedication**: Honor someone special

## Fees
- Platform fee: 2.9% + $0.30
- Option to cover fees
- 100% goes to campaign if covered

## Security
- SSL encryption
- PCI compliant
- Secure payment processing
- Money-back guarantee for fraud

## Tax Information
- 501(c)(3) donations are deductible
- Automatic receipts provided
- Consult your tax advisor

## Need Help?
Email donations@blessedhorizon.org`,

  'faq/general-faq.md': `# Frequently Asked Questions

## What is Blessed Horizon?
Blessed Horizon is a trusted fundraising platform connecting people in need with compassionate donors worldwide.

## How does it work?
1. Campaign creators share their stories
2. We verify campaign authenticity
3. Donors contribute securely
4. Funds are released transparently
5. Updates keep everyone informed

## Is it free to use?
Yes! Creating an account and browsing is free. We charge a small platform fee (2.9% + $0.30) on donations.

## How do you verify campaigns?
We use multi-step verification:
- Identity verification
- Document review
- Story validation
- Ongoing monitoring

## What payment methods are accepted?
- All major credit/debit cards
- Apple Pay & Google Pay
- Bank transfers
- International cards

## Are donations tax-deductible?
Donations to 501(c)(3) organizations are tax-deductible. Personal campaigns generally are not.

## How do I withdraw funds?
From your dashboard, click "Withdraw Funds" and follow the prompts. Funds arrive in 2-5 business days.

## Is my information secure?
Yes! We use bank-level encryption and are PCI compliant. We never store full payment details.

## Still have questions?
Contact support@blessedhorizon.org or visit our [Help Center](/help).`
};

class DocumentationService {
  async fetchDocument(path) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const content = documentationContent[path];
    if (content) {
      return content;
    }
    
    throw new Error('Document not found');
  }

  async searchDocuments(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    Object.entries(documentationContent).forEach(([path, content]) => {
      if (content.toLowerCase().includes(lowerQuery)) {
        const lines = content.split('\n');
        const titleLine = lines.find(line => line.startsWith('#'));
        const title = titleLine ? titleLine.replace(/^#+\s/, '') : 'Untitled';
        
        results.push({
          path,
          title,
          excerpt: this.getExcerpt(content, lowerQuery)
        });
      }
    });
    
    return results;
  }

  getExcerpt(content, query) {
    const index = content.toLowerCase().indexOf(query);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    let excerpt = content.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }
}

export const documentationService = new DocumentationService();
