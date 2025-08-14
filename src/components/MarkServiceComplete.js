import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

/**
 * MarkServiceComplete Component
 * Provides mobile-first service completion workflow for Jason's landscaping business
 * Integrates with collecting invoice system automatically
 */
function MarkServiceComplete({ 
  appointment, 
  onComplete = () => {}, 
  onError = () => {}, 
  className = "", 
  size = "default" 
}) {
  const { markServiceComplete, clients } = useData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [serviceDetails, setServiceDetails] = useState({
    description: '',
    rate: '',
    quantity: 1,
    notes: ''
  });

  // Get client info
  const client = clients.find(c => c.id === appointment.client_id);
  
  // Initialize service details when dialog opens
  const handleOpenDialog = () => {
    if (client) {
      setServiceDetails({
        description: appointment.service_type || client.serviceType || client.service_type || 'Service',
        rate: parseFloat(client.price?.replace(/[^0-9.]/g, '') || '0'),
        quantity: 1,
        notes: appointment.notes || ''
      });
    }
    setShowConfirmDialog(true);
  };

  // Handle service completion
  const handleConfirmComplete = async () => {
    if (!client) {
      onError('Client not found');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Call the existing markServiceComplete function
      await markServiceComplete(client.id, {
        description: serviceDetails.description,
        rate: parseFloat(serviceDetails.rate) || 0,
        quantity: parseFloat(serviceDetails.quantity) || 1,
        completedDate: new Date().toISOString().split('T')[0]
      });

      // Close dialog and notify parent component
      setShowConfirmDialog(false);
      onComplete(appointment);
      
    } catch (error) {
      console.error('Failed to complete service:', error);
      onError(error.message || 'Failed to complete service');
    } finally {
      setIsProcessing(false);
    }
  };

  // Button size classes for mobile-first design
  const sizeClasses = {
    small: "px-3 py-2 text-sm min-h-[36px]",
    default: "px-4 py-3 text-base min-h-[44px]", // Mobile-friendly touch target
    large: "px-6 py-4 text-lg min-h-[52px]"
  };

  return (
    <>
      {/* Mark Complete Button */}
      <button
        onClick={handleOpenDialog}
        disabled={isProcessing}
        className={`
          btn btn-primary font-semibold text-white 
          bg-green-600 hover:bg-green-700 
          border-green-600 hover:border-green-700
          transition-all duration-200 
          focus:ring-2 focus:ring-green-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${className}
        `}
        style={{
          // Ensure consistent mobile styling
          backgroundColor: '#059669',
          borderColor: '#059669',
          minHeight: '44px', // iOS/Android touch target minimum
          touchAction: 'manipulation' // Prevent zoom on double-tap
        }}
      >
        {isProcessing ? (
          <>
            <span className="inline-block animate-spin mr-2">⟳</span>
            Processing...
          </>
        ) : (
          <>
            <span className="mr-2">✓</span>
            Mark Complete
          </>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-sm sm:max-w-lg mx-auto shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Complete Service
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Add this service to {client?.name}'s collecting invoice
              </p>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Client Info */}
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm">
                  <p className="font-medium text-blue-900">{client?.name}</p>
                  <p className="text-blue-700">{client?.address}</p>
                  <p className="text-blue-700">{appointment.appointment_date} at {appointment.appointment_time}</p>
                </div>
              </div>

              {/* Service Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Description *
                </label>
                <input
                  type="text"
                  value={serviceDetails.description}
                  onChange={(e) => setServiceDetails(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: '44px' }} // Mobile friendly
                  placeholder="Lawn mowing, trimming, etc."
                  required
                />
              </div>

              {/* Rate and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceDetails.rate}
                    onChange={(e) => setServiceDetails(prev => ({ ...prev, rate: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ minHeight: '44px' }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={serviceDetails.quantity}
                    onChange={(e) => setServiceDetails(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ minHeight: '44px' }}
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Total Preview */}
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Service Amount:</span>
                  <span className="text-lg font-bold text-green-900">
                    ${((parseFloat(serviceDetails.rate) || 0) * (parseFloat(serviceDetails.quantity) || 1)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={serviceDetails.notes}
                  onChange={(e) => setServiceDetails(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isProcessing}
                className="btn btn-outline w-full sm:w-auto min-h-[44px] py-3 px-4 text-base sm:text-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={isProcessing || !serviceDetails.description || !serviceDetails.rate}
                className="btn btn-primary w-full sm:w-auto min-h-[44px] py-3 px-4 text-base sm:text-lg bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Adding to Invoice...
                  </>
                ) : (
                  'Complete & Add to Invoice'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MarkServiceComplete;