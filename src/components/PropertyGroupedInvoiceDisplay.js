/**
 * Property Grouped Invoice Display Component
 * Displays invoice line items grouped by property for parent companies
 */

import React from 'react';
import { 
  groupLineItemsByProperty, 
  cleanServiceDescription,
  formatPropertyGroupHeader 
} from '../utils/propertyGrouping';

const PropertyGroupedInvoiceDisplay = ({ 
  lineItems, 
  editing, 
  editService,
  services,
  removing,
  setEditService,
  handleEditService,
  cancelEditing,
  startEditingService,
  handleRemoveService
}) => {
  const { groups, totalAmount } = groupLineItemsByProperty(lineItems);

  if (!groups || Object.keys(groups).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No services added yet. Add your first service below.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.values(groups).map((group) => (
        <div key={group.propertyName} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          
          {/* Property Header */}
          <div className="mb-4 pb-2 border-b border-gray-400">
            <h4 className="text-lg font-semibold text-gray-800">
              {formatPropertyGroupHeader(group.propertyName)}
            </h4>
          </div>

          {/* Property Services */}
          <div className="space-y-3 mb-4">
            {group.items.map((lineItem) => (
              <div key={lineItem.id} className="border border-gray-200 rounded-md p-4 bg-white">
                {editing[lineItem.id] === 'editing' ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium mb-2">Service Description *</label>
                      <select
                        required
                        value={editService.description}
                        onChange={(e) => setEditService({...editService, description: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="">Select a service...</option>
                        {services.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Qty</label>
                      <input
                        type="text"
                        required
                        value={editService.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\\d+$/.test(value)) {
                            setEditService({...editService, quantity: value === '' ? '' : parseInt(value)});
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        placeholder=""
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Rate</label>
                      <input
                        type="text"
                        value={editService.rate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setEditService({...editService, rate: value});
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                        <strong>${((editService.quantity || 0) * (editService.rate || 0)).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditService(lineItem.id)}
                          disabled={editing[lineItem.id] === true}
                          className="btn btn-primary btn-sm"
                        >
                          {editing[lineItem.id] === true ? '⏳' : '✓'}
                        </button>
                        <button
                          onClick={() => cancelEditing()}
                          className="btn btn-outline btn-sm"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {cleanServiceDescription(lineItem.description)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Qty: {lineItem.quantity} × ${lineItem.rate.toFixed(2)} = ${lineItem.itemAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditingService(lineItem)}
                        className="btn btn-outline btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveService(lineItem.id, lineItem.description)}
                        disabled={removing[lineItem.id]}
                        className="btn btn-danger btn-sm"
                      >
                        {removing[lineItem.id] ? '⏳ Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Property Subtotal */}
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-600">Property Subtotal:</p>
                <p className="text-lg font-semibold text-green-600">
                  ${group.subtotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Total for All Properties */}
      {Object.keys(groups).length > 1 && (
        <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold text-green-800">
              TOTAL FOR ALL PROPERTIES:
            </h4>
            <p className="text-2xl font-bold text-green-800">
              ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyGroupedInvoiceDisplay;