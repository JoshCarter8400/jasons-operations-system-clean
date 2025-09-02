import React, { useState, useEffect } from 'react';
import { 
  linkClientToParent, 
  unlinkClientFromParent, 
  convertClientToParent,
  convertParentToIndividual,
  getChildPropertiesForParent
} from '../utils/databaseHelpers';

/**
 * Multi-Property Management Controls
 * Provides UI controls for linking/unlinking clients to parent companies
 * Mobile-optimized for Jason's workflow
 */
const MultiPropertyControls = ({ 
  client, 
  parentCompanies = [], 
  onClientUpdated,
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [error, setError] = useState('');
  const [childCount, setChildCount] = useState(0);

  // Load child count for parent companies
  useEffect(() => {
    const loadChildCount = async () => {
      if (client.client_type === 'parent') {
        try {
          const children = await getChildPropertiesForParent(client.id);
          setChildCount(children.length);
        } catch (error) {
          console.error('Failed to load child count:', error);
        }
      }
    };

    loadChildCount();
  }, [client]);

  const handleLinkToParent = async () => {
    if (!selectedParentId) {
      setError('Please select a parent company');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await linkClientToParent(client.id, parseInt(selectedParentId));
      alert(`✅ Successfully linked "${client.name}" to parent company`);
      if (onClientUpdated) onClientUpdated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to link client to parent:', error);
      setError(`Failed to link client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkFromParent = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to unlink "${client.name}" from its parent company?\n\nThis will convert it back to an individual client.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await unlinkClientFromParent(client.id);
      alert(`✅ Successfully unlinked "${client.name}" from parent company`);
      if (onClientUpdated) onClientUpdated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to unlink client from parent:', error);
      setError(`Failed to unlink client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToParent = async () => {
    const confirmed = window.confirm(
      `Convert "${client.name}" to a parent company?\n\nThis will allow other clients to be linked to this company for consolidated billing.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await convertClientToParent(client.id);
      alert(`✅ Successfully converted "${client.name}" to a parent company`);
      if (onClientUpdated) onClientUpdated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to convert client to parent:', error);
      setError(`Failed to convert client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertParentToIndividual = async () => {
    if (childCount > 0) {
      setError(`Cannot convert parent company back to individual. It has ${childCount} linked properties. Please unlink all child properties first.`);
      return;
    }

    const confirmed = window.confirm(
      `Convert "${client.name}" back to an individual client?\n\nThis will remove its parent company status. You can convert it back to a parent company later if needed.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await convertParentToIndividual(client.id);
      alert(`✅ Successfully converted "${client.name}" back to an individual client`);
      if (onClientUpdated) onClientUpdated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to convert parent to individual:', error);
      setError(`Failed to convert client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Multi-Property Management</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Current Status */}
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-medium mb-2">Current Status:</h4>
          <p className="text-sm">
            <strong>{client.name}</strong> is currently a{' '}
            <span className="font-medium">
              {client.client_type === 'parent' ? 'parent company' :
               client.client_type === 'child' ? 'child property' :
               'individual client'}
            </span>
          </p>
        </div>

        {/* Individual Client Options */}
        {client.client_type === 'individual' && (
          <>
            {/* Link to Parent */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">🔗 Link to Parent Company</h4>
              <div className="space-y-3">
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  disabled={loading}
                >
                  <option value="">Select parent company...</option>
                  {parentCompanies.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLinkToParent}
                  disabled={loading || !selectedParentId}
                  className="btn btn-primary w-full min-h-[44px]"
                >
                  {loading ? 'Linking...' : 'Link to Parent Company'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Link this client to a parent company for consolidated billing.
              </p>
            </div>

            {/* Convert to Parent */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">🏢 Convert to Parent Company</h4>
              <button
                onClick={handleConvertToParent}
                disabled={loading}
                className="btn btn-secondary w-full min-h-[44px]"
              >
                {loading ? 'Converting...' : 'Convert to Parent Company'}
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Convert this client into a parent company that can manage multiple properties.
              </p>
            </div>
          </>
        )}

        {/* Parent Company Options */}
        {client.client_type === 'parent' && (
          <>
            {/* Properties Info */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">🏠 Properties Management</h4>
              <div className="bg-blue-50 p-3 rounded mb-3">
                <p className="text-sm text-blue-800">
                  This parent company currently has <strong>{childCount}</strong> linked properties.
                  Individual clients can be linked to it for consolidated billing.
                </p>
              </div>
            </div>

            {/* Convert Back to Individual (only if no children) */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">👤 Convert Back to Individual</h4>
              {childCount > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Cannot convert back to individual while {childCount} properties are still linked.
                    Please unlink all child properties first.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleConvertParentToIndividual}
                    disabled={loading}
                    className="btn btn-outline w-full min-h-[44px] text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
                  >
                    {loading ? 'Converting...' : 'Convert Back to Individual'}
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    Remove parent company status and convert back to an individual client.
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {/* Child Property Options */}
        {client.client_type === 'child' && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">🔓 Unlink from Parent</h4>
            <button
              onClick={handleUnlinkFromParent}
              disabled={loading}
              className="btn btn-outline w-full min-h-[44px] text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
            >
              {loading ? 'Unlinking...' : 'Unlink from Parent Company'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Remove the link to the parent company and make this an individual client.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiPropertyControls;