import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID_INVOICE = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_INVOICE;
const EMAILJS_TEMPLATE_ID_RECEIPT = process.env.REACT_APP_EMAILJS_TEMPLATE_ID_RECEIPT;
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

// Business Information
const BUSINESS_INFO = {
  name: "Trusting and Affordable Tree Service and Lawn Care",
  email: process.env.REACT_APP_JASON_BUSINESS_EMAIL || "trustingandaffordabletrees@gmail.com",
  phone: process.env.REACT_APP_JASON_PHONE_NUMBER || "(516) 580-1223",
  serviceAreas: "Sarasota, Bradenton, Nokomis, Osprey, North Venice",
  paymentMethods: "Zelle, Venmo, Cash App, Check",
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
        <p style="margin: 5px 0; color: #6b7280;"><strong>Accepted Methods:</strong> ${BUSINESS_INFO.paymentMethods}</p>
        <p style="margin: 5px 0; color: #6b7280;"><strong>Service Areas:</strong> ${BUSINESS_INFO.serviceAreas}</p>
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
        <p style="margin: 15px 0 5px 0; font-size: 14px;">Serving: ${BUSINESS_INFO.serviceAreas}</p>
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

// SMS notification placeholder for future Twilio integration
const sendSMSNotification = async (type, phoneNumber, message) => {
  // Placeholder for future Twilio SMS integration
  
  // For now, just log the SMS that would be sent
  createEmailNotification(
    'info',
    'SMS Ready',
    `SMS notification prepared for ${phoneNumber} (Twilio integration needed)`,
    true
  );
  
  return {
    success: false,
    error: 'SMS service not implemented yet'
  };
};

// Initialize EmailJS when the module loads
initEmailJS();

export {
  initEmailJS,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  createEmailNotification,
  sendSMSNotification
};