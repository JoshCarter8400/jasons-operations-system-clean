import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID_INVOICE = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_INVOICE;
const EMAILJS_TEMPLATE_ID_RECEIPT = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_RECEIPT;
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.REACT_APP_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.REACT_APP_TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.REACT_APP_TWILIO_PHONE_NUMBER;

// Business Information
const BUSINESS_INFO = {
  name: "Trusting and Affordable Tree Service and Lawn Care",
  email: process.env.REACT_APP_JASON_BUSINESS_EMAIL,
  phone: process.env.REACT_APP_JASON_PHONE_NUMBER,
  taxRate: 0,
  tagline: "Professional Landscape Services - Glad to be helpful",
  brandColor: "#16a34a"
};

// Initialize EmailJS
const initEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  } else {
    console.warn('EmailJS public key not configured');
  }
};

// Helper function to check if notes contain meaningful content
const hasValidNotes = (notes) => {
  if (!notes || typeof notes !== 'string') {
    return false;
  }
  
  const trimmedNotes = notes.trim();
  
  // Check if notes are empty
  if (trimmedNotes === '') {
    return false;
  }
  
  // Check for common placeholder text patterns
  const placeholderPatterns = [
    /^add any additional details/i,
    /^enter additional notes/i,
    /^additional details/i,
    /^notes$/i,
    /^add notes here/i,
    /^placeholder/i,
    /^enter notes/i,
    /add any additional details.*special instructions.*notes.*invoice/i
  ];
  
  return !placeholderPatterns.some(pattern => pattern.test(trimmedNotes));
};

// Create professional HTML email template for invoices
const createInvoiceEmailHTML = (invoice, client, businessInfo) => {
  console.log('🔍 DEBUG - businessInfo in email:', businessInfo);
  console.log('🔍 DEBUG - serviceAreas:', businessInfo.serviceAreas);
  console.log('🔍 DEBUG - paymentMethods:', businessInfo.paymentMethods);
  console.log('🔍 DEBUG - serviceAreas type:', typeof businessInfo.serviceAreas);
  console.log('🔍 DEBUG - paymentMethods type:', typeof businessInfo.paymentMethods);
  
  const subtotal = invoice.subtotal || 0;
  const total = invoice.total || 0;
  
  const lineItems = (invoice.line_items || invoice.services || []).map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.rate || item.amount || 0).toFixed(2)}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${((item.quantity || 1) * (item.rate || item.amount || 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.id}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${BUSINESS_INFO.brandColor}, #059669); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${BUSINESS_INFO.name}</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">${BUSINESS_INFO.tagline}</p>
    </div>

    <!-- Invoice Header -->
    <div style="padding: 30px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; color: #1f2937; font-size: 24px;">Invoice #${invoice.id}</h2>
          <p style="margin: 5px 0; color: #6b7280;">Date: ${new Date(invoice.date || Date.now()).toLocaleDateString()}</p>
          <p style="margin: 5px 0; color: #6b7280;">Due Date: ${new Date(invoice.due_date || invoice.dueDate || Date.now()).toLocaleDateString()}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #1f2937; font-weight: bold;">From:</p>
          <p style="margin: 5px 0; color: #6b7280;">${BUSINESS_INFO.name}</p>
          <p style="margin: 5px 0; color: #6b7280;">${BUSINESS_INFO.phone}</p>
          <p style="margin: 5px 0; color: #6b7280;">${BUSINESS_INFO.email}</p>
        </div>
      </div>

      <!-- Client Information -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0; color: #1f2937; font-weight: bold;">Bill To:</p>
        <p style="margin: 5px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${client.name}</p>
        <p style="margin: 5px 0; color: #6b7280;">${client.email}</p>
        ${client.address ? `<p style="margin: 5px 0; color: #6b7280;">${client.address}</p>` : ''}
        ${client.phone ? `<p style="margin: 5px 0; color: #6b7280;">${client.phone}</p>` : ''}
      </div>

      <!-- Services Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Description</th>
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Qty</th>
            <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Rate</th>
            <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems}
        </tbody>
      </table>

      <!-- Notes Section -->
      ${hasValidNotes(invoice.notes) ? `
      <div style="background-color: #f9fafb; border-left: 4px solid ${BUSINESS_INFO.brandColor}; padding: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">📝 Additional Notes</h3>
        <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6;">${invoice.notes}</p>
      </div>
      ` : ''}

      <!-- Totals -->
      <div style="text-align: right; margin-bottom: 30px;">
        <div style="display: inline-block; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Subtotal:</span>
            <span style="color: #1f2937; font-weight: 600;">$${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">
            <span style="color: #1f2937; font-weight: bold; font-size: 18px;">Total:</span>
            <span style="color: ${BUSINESS_INFO.brandColor}; font-weight: bold; font-size: 18px;">$${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Payment Information -->
      <div style="background-color: #ecfdf5; border-left: 4px solid ${BUSINESS_INFO.brandColor}; padding: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">Payment Information</h3>
        <p style="margin: 5px 0; color: #6b7280;"><strong>Accepted Methods:</strong> Cash, Cash App, Check, Credit Card, Email Invoice, PayPal, Venmo, Zelle</p>
        <p style="margin: 5px 0; color: #6b7280;"><strong>Service Areas:</strong> Bradenton, Downtown, Lakewood Ranch, Nokomis, North Venice, Osprey, Sarasota</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 5px 0;">Thank you for choosing ${BUSINESS_INFO.name}!</p>
        <p style="margin: 5px 0;">Questions? Contact us at ${BUSINESS_INFO.phone} or ${BUSINESS_INFO.email}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Create professional HTML email template for payment receipts
const createReceiptEmailHTML = (invoice, client, businessInfo, paymentMethod) => {
  const total = invoice.total || 0;
  
  const lineItems = (invoice.line_items || invoice.services || []).map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${((item.quantity || 1) * (item.rate || item.amount || 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt #${invoice.id}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${BUSINESS_INFO.brandColor}, #059669); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${BUSINESS_INFO.name}</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Payment Receipt</p>
    </div>

    <!-- Receipt Header -->
    <div style="padding: 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #ecfdf5; padding: 20px; border-radius: 12px; border: 2px solid ${BUSINESS_INFO.brandColor};">
          <h2 style="margin: 0; color: ${BUSINESS_INFO.brandColor}; font-size: 24px;">✓ Payment Received</h2>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 16px;">Invoice #${invoice.id}</p>
        </div>
      </div>

      <!-- Payment Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <p style="margin: 0; color: #1f2937; font-weight: bold;">Payment Date:</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 18px;">${new Date(invoice.paid_date || invoice.paidDate || Date.now()).toLocaleDateString()}</p>
          <p style="margin: 15px 0 5px 0; color: #1f2937; font-weight: bold;">Payment Method:</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 18px;">${paymentMethod}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #1f2937; font-weight: bold;">Amount Paid:</p>
          <p style="margin: 5px 0; color: ${BUSINESS_INFO.brandColor}; font-size: 32px; font-weight: bold;">$${total.toFixed(2)}</p>
        </div>
      </div>

      <!-- Customer Information -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0; color: #1f2937; font-weight: bold;">Customer:</p>
        <p style="margin: 5px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${client.name}</p>
        <p style="margin: 5px 0; color: #6b7280;">${client.email}</p>
        ${client.address ? `<p style="margin: 5px 0; color: #6b7280;">${client.address}</p>` : ''}
        ${client.phone ? `<p style="margin: 5px 0; color: #6b7280;">${client.phone}</p>` : ''}
      </div>

      <!-- Services Summary -->
      <h3 style="color: #1f2937; margin-bottom: 15px;">Services Provided:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Description</th>
            <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937; border-bottom: 2px solid ${BUSINESS_INFO.brandColor};">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems}
        </tbody>
      </table>

      <!-- Notes Section -->
      ${hasValidNotes(invoice.notes) ? `
      <div style="background-color: #f9fafb; border-left: 4px solid ${BUSINESS_INFO.brandColor}; padding: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">📝 Additional Details</h3>
        <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6;">${invoice.notes}</p>
      </div>
      ` : ''}

      <!-- Thank You Message -->
      <div style="background: linear-gradient(135deg, #ecfdf5, #f0fdf4); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: ${BUSINESS_INFO.brandColor};">Thank You!</h3>
        <p style="margin: 5px 0; color: #1f2937; font-size: 16px;">We appreciate your business and prompt payment.</p>
        <p style="margin: 5px 0; color: #6b7280;">Your satisfaction is our priority.</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 5px 0;"><strong>${BUSINESS_INFO.name}</strong></p>
        <p style="margin: 5px 0;">${BUSINESS_INFO.phone} | ${BUSINESS_INFO.email}</p>
        <p style="margin: 5px 0; font-style: italic;">${BUSINESS_INFO.tagline}</p>
        <p style="margin: 15px 0 5px 0; font-size: 14px;">Serving: Bradenton, Downtown, Lakewood Ranch, Nokomis, North Venice, Osprey, Sarasota</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Send invoice email using EmailJS
const sendInvoiceEmail = async (invoice, client, businessInfo) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_INVOICE || !EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS not fully configured, using fallback notification');
      createEmailNotification(
        'warning',
        'Email Configuration Required',
        'Please configure EmailJS settings to send emails. Invoice notification shown locally.',
        false
      );
      return {
        success: false,
        error: 'EmailJS not configured'
      };
    }

    const emailHTML = createInvoiceEmailHTML(invoice, client, businessInfo);
    
    const templateParams = {
      to_email: client.email,
      to_name: client.name,
      from_name: BUSINESS_INFO.name,
      from_email: BUSINESS_INFO.email,
      subject: `Invoice #${invoice.id} from ${BUSINESS_INFO.name}`,
      invoice_number: invoice.id,
      invoice_date: new Date(invoice.date || Date.now()).toLocaleDateString(),
      due_date: new Date(invoice.due_date || invoice.dueDate || Date.now()).toLocaleDateString(),
      total_amount: (invoice.total || 0).toFixed(2),
      client_name: client.name,
      business_name: BUSINESS_INFO.name,
      business_phone: BUSINESS_INFO.phone,
      business_email: BUSINESS_INFO.email,
      email_html: emailHTML
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_INVOICE,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    
    createEmailNotification(
      'email',
      'Invoice Email Sent',
      `Invoice #${invoice.id} sent to ${client.email}`,
      true
    );

    return {
      success: true,
      messageId: response.text || `invoice_${invoice.id}_${Date.now()}`,
      recipient: client.email
    };
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    
    createEmailNotification(
      'error',
      'Email Send Failed',
      `Failed to send invoice to ${client.email}: ${error.message}`,
      false
    );

    return {
      success: false,
      error: error.message
    };
  }
};

// Send payment receipt email using EmailJS
const sendPaymentReceiptEmail = async (invoice, client, businessInfo, paymentMethod) => {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_RECEIPT || !EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS not fully configured, using fallback notification');
      createEmailNotification(
        'warning',
        'Email Configuration Required',
        'Please configure EmailJS settings to send emails. Receipt notification shown locally.',
        false
      );
      return {
        success: false,
        error: 'EmailJS not configured'
      };
    }

    const emailHTML = createReceiptEmailHTML(invoice, client, businessInfo, paymentMethod);
    
    const templateParams = {
      to_email: client.email,
      to_name: client.name,
      from_name: BUSINESS_INFO.name,
      from_email: BUSINESS_INFO.email,
      subject: `Payment Receipt #${invoice.id} - ${BUSINESS_INFO.name}`,
      invoice_number: invoice.id,
      payment_date: new Date(invoice.paid_date || invoice.paidDate || Date.now()).toLocaleDateString(),
      payment_method: paymentMethod,
      amount_paid: (invoice.total || 0).toFixed(2),
      client_name: client.name,
      business_name: BUSINESS_INFO.name,
      business_phone: BUSINESS_INFO.phone,
      business_email: BUSINESS_INFO.email,
      email_html: emailHTML
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_RECEIPT,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    
    createEmailNotification(
      'email',
      'Receipt Email Sent',
      `Payment receipt for invoice #${invoice.id} sent to ${client.email}`,
      true
    );

    return {
      success: true,
      messageId: response.text || `receipt_${invoice.id}_${Date.now()}`,
      recipient: client.email
    };
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
    
    createEmailNotification(
      'error',
      'Email Send Failed',
      `Failed to send receipt to ${client.email}: ${error.message}`,
      false
    );

    return {
      success: false,
      error: error.message
    };
  }
};

// Create visual notification (maintains existing functionality)
const createEmailNotification = (type, title, message, isSuccess = true) => {
  // Create a visual notification that looks like website styling
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 ${
    isSuccess ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
  }`;
  
  const icon = type === 'email' ? '📧' : 
               type === 'warning' ? '⚠️' : 
               isSuccess ? '✅' : '❌';
  
  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 text-lg">
        ${icon}
      </div>
      <div class="flex-1">
        <h4 class="font-medium text-sm mb-1">${title}</h4>
        <p class="text-sm opacity-90">${message}</p>
      </div>
      <button class="flex-shrink-0 text-lg hover:opacity-70" onclick="this.parentElement.parentElement.remove()">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 6 seconds for email notifications, 5 for others
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, type === 'email' ? 6000 : 5000);
};

// ============================================================================
// TWILIO SMS FUNCTIONALITY (Direct REST API Implementation)
// ============================================================================

// Direct REST API approach to bypass browser compatibility issues with Twilio SDK

const checkTwilioConfig = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not fully configured - SMS features disabled');
    return false;
  }
  return true;
};

// Enhanced phone number validation and formatting
const validatePhoneNumber = (phone) => {
  if (!phone) return { valid: false, error: 'No phone number provided' };
  
  const digits = phone.replace(/\D/g, '');
  
  // Check for valid US phone number lengths
  if (digits.length < 10) {
    return { valid: false, error: 'Phone number too short (need at least 10 digits)' };
  }
  
  if (digits.length > 11) {
    return { valid: false, error: 'Phone number too long (max 11 digits)' };
  }
  
  // Check for invalid patterns
  if (digits.startsWith('0') || digits.startsWith('1')) {
    if (digits.length === 10) {
      return { valid: false, error: 'US phone numbers cannot start with 0 or 1' };
    }
  }
  
  // Validate area code (first 3 digits after country code)
  const areaCode = digits.length === 11 ? digits.substring(1, 4) : digits.substring(0, 3);
  if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
    return { valid: false, error: 'Invalid area code (cannot start with 0 or 1)' };
  }
  
  return { valid: true };
};

// Format phone number for Twilio (converts "3058962811" to "+13058962811")
const formatPhoneNumberForTwilio = (phone) => {
  if (!phone) return null;
  
  // Validate first
  const validation = validatePhoneNumber(phone);
  if (!validation.valid) {
    createEmailNotification(
      'error',
      'Invalid Phone Number',
      validation.error,
      false
    );
    return null;
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  let formatted;
  // Handle different formats
  if (digits.length === 10) {
    // US number without country code: "3058962811" -> "+13058962811"
    formatted = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code: "13058962811" -> "+13058962811"
    formatted = `+${digits}`;
  } else if (digits.length === 11) {
    // Other country with 11 digits: "13058962811" -> "+13058962811"
    formatted = `+${digits}`;
  } else if (phone.startsWith('+')) {
    // Already formatted: "+13058962811" -> "+13058962811"
    formatted = phone;
  } else {
    // Unknown format, try adding +1 for US
    formatted = `+1${digits}`;
  }
  
  return formatted;
};

// Send SMS using Twilio REST API (browser-compatible)
const sendTwilioSMS = async (to, body) => {
  try {
    // Validate phone number format
    const formattedTo = formatPhoneNumberForTwilio(to);
    if (!formattedTo) {
      throw new Error('Invalid phone number format');
    }
    
    // Create the request body for Twilio API
    const formData = new URLSearchParams();
    formData.append('To', formattedTo);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', body);
    
    // Create Basic Auth header
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      // Start delivery status polling in background
      setTimeout(async () => {
        await pollSMSStatus(result.sid);
      }, 1000); // Start checking after 1 second
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: result.to,
        from: result.from
      };
    } else {
      console.error('Twilio API Error:', result);
      throw new Error(`Twilio Error ${result.code}: ${result.message}`);
    }
  } catch (error) {
    console.error('SMS sending failed:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

// Check SMS delivery status using Twilio API
const checkSMSDeliveryStatus = async (messageSid) => {
  try {
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      // Check for delivery issues
      if (result.error_code) {
        // Common error explanations
        const errorExplanations = {
          '30001': 'Message body is required',
          '30003': 'Unreachable destination handset',
          '30004': 'Message blocked (content filtered)',
          '30005': 'Unknown destination handset',
          '30007': 'Message delivery failed',
          '30008': 'Message delivery failed - unknown error',
          '21211': 'Invalid To phone number',
          '21614': 'Phone number is not verified (trial account)',
          '21612': 'Phone number cannot receive SMS',
          '30034': 'Message delivery failed - carrier rejected',
        };
        
        const explanation = errorExplanations[result.error_code] || 'Unknown error';
        
        createEmailNotification(
          'error',
          'SMS Delivery Failed',
          `Error ${result.error_code}: ${explanation}`,
          false
        );
      } else {
        if (result.status === 'delivered') {
          createEmailNotification(
            'info',
            'SMS Delivered!',
            `Message successfully delivered to ${result.to}`,
            true
          );
        } else if (result.status === 'failed' || result.status === 'undelivered') {
          createEmailNotification(
            'error',
            'SMS Not Delivered',
            `Message could not be delivered`,
            false
          );
        }
      }
      
      return {
        success: true,
        status: result.status,
        errorCode: result.error_code,
        errorMessage: result.error_message,
        details: result
      };
    } else {
      console.error('Failed to check SMS status:', result);
      return {
        success: false,
        error: result.message
      };
    }
  } catch (error) {
    console.error('Error checking SMS delivery status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Poll SMS delivery status with delay
const pollSMSStatus = async (messageSid, maxAttempts = 5, delayMs = 3000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusResult = await checkSMSDeliveryStatus(messageSid);
    
    if (statusResult.success) {
      const status = statusResult.status;
      
      // Terminal statuses - stop polling
      if (['delivered', 'failed', 'undelivered'].includes(status)) {
        return statusResult;
      }
      
      // Continue polling for non-terminal statuses
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } else {
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return { success: false, error: 'Polling timeout' };
};

// Create SMS text templates for invoices
const createInvoiceSMSText = (invoice, client, businessInfo) => {
  const total = (invoice.total || 0).toFixed(2);
  const serviceCount = (invoice.line_items || invoice.services || []).length;
  
  return `🌳 ${businessInfo.name}

📋 Invoice #${invoice.id}
👤 ${client.name}
💰 Total: $${total}
🔧 Services: ${serviceCount} item${serviceCount !== 1 ? 's' : ''}

💳 Payment Options: ${businessInfo.paymentMethods}

📞 Questions? Call ${businessInfo.phone}

Thank you for choosing our services! 🙏`;
};

// Create SMS text templates for payment receipts
const createReceiptSMSText = (invoice, client, businessInfo, paymentMethod) => {
  const total = (invoice.total || 0).toFixed(2);
  const paidDate = new Date(invoice.paid_date || invoice.paidDate || Date.now()).toLocaleDateString();
  
  return `✅ ${businessInfo.name}

🧾 Payment Receipt
📋 Invoice #${invoice.id}
👤 ${client.name}
💰 Amount Paid: $${total}
💳 Method: ${paymentMethod}
📅 Date: ${paidDate}

Thank you for your prompt payment! We appreciate your business. 🙏

📞 ${businessInfo.phone}`;
};

// Send invoice notification via SMS
const sendInvoiceSMS = async (invoice, client, businessInfo) => {
  try {
    // Check if client has a phone number
    if (!client.phone) {
      createEmailNotification(
        'warning',
        'No Phone Number',
        `Cannot send SMS to ${client.name} - no phone number on file`,
        false
      );
      return {
        success: false,
        error: 'No phone number available'
      };
    }

    // Format phone number for Twilio
    const formattedPhone = formatPhoneNumberForTwilio(client.phone);
    const smsText = createInvoiceSMSText(invoice, client, businessInfo);
    
    // Check if Twilio is configured
    if (!checkTwilioConfig()) {
      // Show SMS preview for development/testing
      createEmailNotification(
        'info',
        'SMS Preview (Twilio Not Configured)',
        `SMS would be sent to ${formattedPhone}: "${smsText.substring(0, 50)}..."`,
        false
      );
      
      return {
        success: false,
        error: 'Twilio not configured - SMS preview shown',
        preview: {
          to: formattedPhone,
          body: smsText
        }
      };
    }
    const twilioResult = await sendTwilioSMS(formattedPhone, smsText);
    
    if (twilioResult.success) {
      createEmailNotification(
        'info',
        'Invoice SMS Sent!',
        `Invoice #${invoice.id} sent via SMS to ${formattedPhone}`,
        true
      );
      
      return {
        success: true,
        messageId: twilioResult.messageId,
        recipient: formattedPhone,
        method: 'sms'
      };
    } else {
      createEmailNotification(
        'error',
        'SMS Send Failed',
        `Failed to send SMS: ${twilioResult.error}`,
        false
      );
      
      return {
        success: false,
        error: twilioResult.error,
        details: twilioResult.details
      };
    }
  } catch (error) {
    console.error('Failed to send invoice SMS:', error);
    
    createEmailNotification(
      'error',
      'SMS Send Failed',
      `Failed to send invoice SMS to ${client.phone}: ${error.message}`,
      false
    );

    return {
      success: false,
      error: error.message
    };
  }
};

// Send payment receipt notification via SMS
const sendPaymentReceiptSMS = async (invoice, client, businessInfo, paymentMethod) => {
  try {
    // Check if client has a phone number
    if (!client.phone) {
      createEmailNotification(
        'warning',
        'No Phone Number',
        `Cannot send receipt SMS to ${client.name} - no phone number on file`,
        false
      );
      return {
        success: false,
        error: 'No phone number available'
      };
    }

    // Format phone number for Twilio
    const formattedPhone = formatPhoneNumberForTwilio(client.phone);

    const smsText = createReceiptSMSText(invoice, client, businessInfo, paymentMethod);
    
    // Check if Twilio is configured
    if (!checkTwilioConfig()) {
      // Show SMS preview for development/testing
      createEmailNotification(
        'info',
        'SMS Preview (Twilio Not Configured)',
        `Receipt SMS would be sent to ${formattedPhone}: "${smsText.substring(0, 50)}..."`,
        false
      );
      
      return {
        success: false,
        error: 'Twilio not configured - SMS preview shown',
        preview: {
          to: formattedPhone,
          body: smsText
        }
      };
    }
    const twilioResult = await sendTwilioSMS(formattedPhone, smsText);
    
    if (twilioResult.success) {
      createEmailNotification(
        'info',
        'Receipt SMS Sent!',
        `Payment receipt for Invoice #${invoice.id} sent via SMS to ${formattedPhone}`,
        true
      );
      
      return {
        success: true,
        messageId: twilioResult.messageId,
        recipient: formattedPhone,
        method: 'sms'
      };
    } else {
      createEmailNotification(
        'error',
        'Receipt SMS Failed',
        `Failed to send receipt SMS: ${twilioResult.error}`,
        false
      );
      
      return {
        success: false,
        error: twilioResult.error,
        details: twilioResult.details
      };
    }
  } catch (error) {
    console.error('Failed to send payment receipt SMS:', error);
    
    createEmailNotification(
      'error',
      'SMS Send Failed',
      `Failed to send receipt SMS to ${client.phone}: ${error.message}`,
      false
    );

    return {
      success: false,
      error: error.message
    };
  }
};

// SMS notification placeholder for backward compatibility
const sendSMSNotification = async (type, phoneNumber, message) => {
  // For backward compatibility, log the SMS that would be sent
  createEmailNotification(
    'info',
    'SMS Ready',
    `SMS notification prepared for ${phoneNumber} (Use sendInvoiceSMS or sendPaymentReceiptSMS for full functionality)`,
    true
  );
  
  return {
    success: false,
    error: 'Use sendInvoiceSMS or sendPaymentReceiptSMS instead'
  };
};

// Initialize EmailJS when the module loads
initEmailJS();

// Simple test SMS function for debugging delivery issues
const sendTestSMS = async (phoneNumber, customMessage = null) => {
  try {
    const testMessage = customMessage || `Hello! This is a test message from Jason's Landscaping System at ${new Date().toLocaleTimeString()}. If you receive this, SMS delivery is working correctly. 🌳`;
    
    const result = await sendTwilioSMS(phoneNumber, testMessage);
    
    if (result.success) {
      createEmailNotification(
        'info',
        'Test SMS Sent',
        `Simple test message sent to ${phoneNumber}. Check console for delivery status.`,
        true
      );
    } else {
      console.error('❌ Test SMS failed:', result.error);
      createEmailNotification(
        'error',
        'Test SMS Failed',
        `Could not send test SMS: ${result.error}`,
        false
      );
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export {
  initEmailJS,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  createEmailNotification,
  sendSMSNotification,
  sendInvoiceSMS,
  sendPaymentReceiptSMS,
  sendTwilioSMS,
  sendTestSMS,
  checkSMSDeliveryStatus,
  pollSMSStatus
};