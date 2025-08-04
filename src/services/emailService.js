// EmailJS configuration for future implementation
// const EMAILJS_SERVICE_ID = 'service_landscaping';
// const EMAILJS_TEMPLATE_ID_INVOICE = 'template_invoice';
// const EMAILJS_TEMPLATE_ID_RECEIPT = 'template_receipt';
// const EMAILJS_USER_ID = 'user_landscaping';

// Initialize EmailJS (this would normally be done with actual EmailJS credentials)
// For demo purposes, we'll simulate email sending
const initEmailJS = () => {
  // In a real implementation, you would call:
  // import emailjs from 'emailjs-com';
  // emailjs.init(EMAILJS_USER_ID);
  console.log('EmailJS initialized');
};

const sendInvoiceEmail = async (invoice, client, businessInfo) => {
  try {
    const templateParams = {
      to_email: client.email,
      to_name: client.name,
      from_name: businessInfo.businessName,
      from_email: businessInfo.email,
      invoice_number: invoice.id,
      invoice_date: invoice.date,
      due_date: invoice.dueDate,
      total_amount: invoice.total.toFixed(2),
      client_address: client.address,
      services: invoice.services.map(s => `${s.description} - $${s.amount.toFixed(2)}`).join('\n'),
      subtotal: invoice.subtotal.toFixed(2),
      tax: invoice.tax.toFixed(2),
      business_phone: businessInfo.phone,
      business_address: businessInfo.address
    };

    // For demo purposes, we'll simulate a successful email send
    // In production, you would use:
    // const response = await emailjs.send(
    //   EMAILJS_SERVICE_ID,
    //   EMAILJS_TEMPLATE_ID_INVOICE,
    //   templateParams,
    //   EMAILJS_USER_ID
    // );

    console.log('Invoice email sent:', templateParams);
    
    // Simulate email success
    return {
      success: true,
      messageId: `invoice_${invoice.id}_${Date.now()}`,
      recipient: client.email
    };
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendPaymentReceiptEmail = async (invoice, client, businessInfo, paymentMethod) => {
  try {
    const templateParams = {
      to_email: client.email,
      to_name: client.name,
      from_name: businessInfo.businessName,
      from_email: businessInfo.email,
      invoice_number: invoice.id,
      payment_date: invoice.paidDate,
      payment_method: paymentMethod,
      amount_paid: invoice.total.toFixed(2),
      client_address: client.address,
      services: invoice.services.map(s => `${s.description} - $${s.amount.toFixed(2)}`).join('\n'),
      business_phone: businessInfo.phone,
      business_address: businessInfo.address
    };

    // For demo purposes, we'll simulate a successful email send
    console.log('Payment receipt email sent:', templateParams);
    
    return {
      success: true,
      messageId: `receipt_${invoice.id}_${Date.now()}`,
      recipient: client.email
    };
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const createEmailNotification = (type, title, message, isSuccess = true) => {
  // Create a visual notification that looks like website styling
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 ${
    isSuccess ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
  }`;
  
  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 text-lg">
        ${isSuccess ? '✅' : '❌'}
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
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
};

export {
  initEmailJS,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  createEmailNotification
};