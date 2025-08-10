import React from 'react';

/**
 * Invoice Status Badge Component
 * Provides consistent status display with proper color coding throughout the system
 */
function InvoiceStatusBadge({ status, size = 'sm', className = '' }) {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'collecting':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '📋',
          label: 'Collecting',
          description: 'Services are being added to this invoice'
        };
      case 'sent':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '📧',
          label: 'Sent',
          description: 'Invoice has been sent to client'
        };
      case 'paid':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          label: 'Paid',
          description: 'Invoice has been paid by client'
        };
      case 'overdue':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '⚠️',
          label: 'Overdue',
          description: 'Invoice is past due date'
        };
      case 'draft':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📄',
          label: 'Draft',
          description: 'Invoice is being created'
        };
      case 'pending':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '⏳',
          label: 'Pending',
          description: 'Invoice is waiting for action'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          label: status || 'Unknown',
          description: 'Unknown status'
        };
    }
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'xs':
        return 'px-1 py-0.5 text-xs';
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${config.color} ${sizeClasses} ${className}
      `.trim()}
      title={config.description}
    >
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Status Progress Indicator
 * Shows the workflow progression for invoices
 */
function InvoiceStatusProgress({ currentStatus, allowedTransitions = [] }) {
  const statusFlow = [
    { status: 'collecting', label: 'Collecting', icon: '📋' },
    { status: 'sent', label: 'Sent', icon: '📧' },
    { status: 'paid', label: 'Paid', icon: '✅' }
  ];

  const getCurrentStepIndex = () => {
    return statusFlow.findIndex(step => step.status === currentStatus?.toLowerCase());
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="flex items-center space-x-2">
      {statusFlow.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        const isAvailable = allowedTransitions.includes(step.status);

        return (
          <React.Fragment key={step.status}>
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm
              ${isActive 
                ? 'bg-blue-500 text-white border-blue-500' 
                : isCompleted 
                ? 'bg-green-500 text-white border-green-500'
                : isAvailable
                ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'
              }
            `.trim()}>
              {step.icon}
            </div>
            
            {index < statusFlow.length - 1 && (
              <div className={`
                h-0.5 w-8
                ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
              `.trim()} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Status Action Buttons
 * Provides appropriate actions based on current status
 */
function InvoiceStatusActions({ 
  invoice, 
  onSend, 
  onMarkPaid, 
  onEdit,
  loading = {},
  disabled = false 
}) {
  const status = invoice.status?.toLowerCase();

  return (
    <div className="flex gap-2">
      {status === 'collecting' && (
        <>
          <button
            onClick={() => onEdit(invoice)}
            disabled={disabled}
            className="btn btn-primary btn-sm"
          >
            📝 Edit
          </button>
          <button
            onClick={() => onSend(invoice)}
            disabled={disabled || loading.sending || !invoice.line_items || invoice.line_items.length === 0}
            className="btn btn-success btn-sm"
          >
            {loading.sending ? '⏳ Sending...' : '📧 Send'}
          </button>
        </>
      )}

      {status === 'sent' && (
        <button
          onClick={() => onMarkPaid(invoice)}
          disabled={disabled || loading.markingPaid}
          className="btn btn-success btn-sm"
        >
          {loading.markingPaid ? '⏳ Processing...' : '✅ Mark Paid'}
        </button>
      )}

      {status === 'paid' && (
        <div className="text-sm text-green-600">
          ✅ Completed
        </div>
      )}

      {(status === 'overdue') && (
        <>
          <button
            onClick={() => onSend(invoice)}
            disabled={disabled || loading.sending}
            className="btn btn-warning btn-sm"
          >
            {loading.sending ? '⏳ Resending...' : '📧 Resend'}
          </button>
          <button
            onClick={() => onMarkPaid(invoice)}
            disabled={disabled || loading.markingPaid}
            className="btn btn-success btn-sm"
          >
            {loading.markingPaid ? '⏳ Processing...' : '✅ Mark Paid'}
          </button>
        </>
      )}
    </div>
  );
}

export { InvoiceStatusBadge, InvoiceStatusProgress, InvoiceStatusActions };
export default InvoiceStatusBadge;