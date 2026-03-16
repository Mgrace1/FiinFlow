import React, { useState, useCallback } from 'react';
import { getUserRole } from '../../utils/roleUtils';
import { apiClient } from '../../api/client';
import { X, ZoomIn, ZoomOut, Download, Eye } from 'lucide-react';

interface PaymentReceiptProps {
  receipts: Array<{
    _id: string;
    fileId: {
      _id?: string;
      originalName?: string;
      mimeType?: string;
    } | string;
    type: string;
    uploadedAt: string;
    uploadedBy?: any;
  }>;
  onDelete: (fileId: string) => void;
  uploading: boolean;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showUpload?: boolean;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  receipts,
  onDelete,
  uploading,
  onUpload,
  showUpload = true,
}) => {
  const userRole = getUserRole();
  const canDelete = userRole === 'admin' || userRole === 'super_admin';

  const paymentReceipts = receipts.filter(r => r.type === 'payment_receipt');

  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFilename, setViewerFilename] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPdf, setIsPdf] = useState(false);
  const [viewerMimeType, setViewerMimeType] = useState('');

  const getFileId = (receipt: PaymentReceiptProps['receipts'][0]) => {
    return typeof receipt.fileId === 'object' ? receipt.fileId._id : receipt.fileId;
  };

  const getFilename = (receipt: PaymentReceiptProps['receipts'][0]) => {
    if (typeof receipt.fileId === 'object') {
      return receipt.fileId.originalName || 'receipt';
    }
    return 'receipt';
  };

  const getMimeType = (receipt: PaymentReceiptProps['receipts'][0]) => {
    return typeof receipt.fileId === 'object' ? receipt.fileId.mimeType || '' : '';
  };

  const isImageFile = (filename: string, mimeType: string) => {
    if (mimeType.startsWith('image/')) return true;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const handleView = useCallback(async (receipt: PaymentReceiptProps['receipts'][0]) => {
    const fileId = getFileId(receipt);
    const filename = getFilename(receipt);
    const mimeType = getMimeType(receipt);
    if (!fileId) return;

    setViewerLoading(true);
    setViewerOpen(true);
    setViewerFilename(filename);
    setZoomLevel(1);
    setViewerMimeType(mimeType);
    setIsPdf(mimeType === 'application/pdf' || /\.pdf$/i.test(filename));

    try {
      const response = await apiClient.get(`/files/${fileId}/download?inline=true`, {
        responseType: 'blob',
      });

      const contentType = String(response.headers['content-type'] || mimeType || 'application/octet-stream');
      setViewerMimeType(contentType);
      setIsPdf(contentType.includes('pdf') || /\.pdf$/i.test(filename));
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      setViewerUrl(blobUrl);
    } catch (error) {
      console.error('Failed to load file:', error);
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (receipt: PaymentReceiptProps['receipts'][0]) => {
    const fileId = getFileId(receipt);
    const filename = getFilename(receipt);
    if (!fileId) return;

    try {
      const response = await apiClient.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
      const responseName = match ? decodeURIComponent(match[1] || match[2]) : '';
      const downloadName = responseName || filename || 'receipt';

      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  }, []);

  const closeViewer = () => {
    if (viewerUrl) {
      window.URL.revokeObjectURL(viewerUrl);
    }
    setViewerOpen(false);
    setViewerUrl(null);
    setZoomLevel(1);
    setViewerMimeType('');
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Payment Receipts</h2>

      {showUpload && onUpload && (
        <div className="mb-4">
          <label className="btn btn-primary cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={onUpload}
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {uploading ? 'Uploading...' : '+ Upload Payment Receipt'}
          </label>
        </div>
      )}

      {/* Receipts List */}
      {paymentReceipts.length > 0 ? (
        <div className="space-y-3">
          {paymentReceipts.map((receipt) => {
            const filename = getFilename(receipt);
            const mimeType = getMimeType(receipt);
            const showThumbnail = isImageFile(filename, mimeType);

            return (
              <div
                key={receipt._id}
                className="border border-green-100 bg-green-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl"></span>
                      <span className="font-semibold text-green-400">
                        Payment Receipt
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Uploaded:</span>{' '}
                        {new Date(receipt.uploadedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(receipt.uploadedAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {receipt.uploadedBy?.name && (
                        <p>
                          <span className="font-medium">Uploaded by:</span>{' '}
                          {receipt.uploadedBy.name}
                        </p>
                      )}
                    </div>

                    {typeof receipt.fileId === 'object' && receipt.fileId?.originalName && (
                      <p className="text-xs text-gray-500 mt-2">
                        File: {receipt.fileId.originalName}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleView(receipt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                      >
                        <Eye size={14} />
                        {showThumbnail ? 'View Image' : 'View File'}
                      </button>
                      <button
                        onClick={() => handleDownload(receipt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => {
                        const fileId = getFileId(receipt);
                        if (fileId) onDelete(fileId);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-yellow-500 bg-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-900 font-medium mb-1">
             No Payment Receipt Uploaded
          </p>
          <p className="text-sm text-yellow-900">
            A payment receipt is required before marking this invoice as paid.
          </p>
          {!showUpload && (
            <p className="text-xs text-yellow-800 mt-2">
              Upload receipt in the Confirm Payment Details modal.
            </p>
          )}
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          {/* Top toolbar */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 px-4 py-3 flex items-center justify-between z-10">
            <span className="text-white text-sm font-medium truncate max-w-xs">
              {viewerFilename}
            </span>
            <div className="flex items-center gap-2">
              {!isPdf && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-white text-xs min-w-[50px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </button>
                </>
              )}
              <button
                onClick={closeViewer}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="w-full h-full pt-14 pb-4 px-4 flex items-center justify-center overflow-auto">
            {viewerLoading ? (
              <div className="text-white text-center">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Loading file...</p>
              </div>
            ) : viewerUrl ? (
              isPdf ? (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full rounded-lg bg-white"
                  title="PDF Viewer"
                />
              ) : viewerMimeType.startsWith('image/') ? (
                <img
                  src={viewerUrl}
                  alt={viewerFilename}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              ) : (
                <div className="text-center text-white">
                  <p className="mb-2">Preview is not supported for this file type.</p>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewerUrl;
                      link.setAttribute('download', viewerFilename || 'file');
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-2 text-sm hover:bg-white/30"
                  >
                    <Download size={14} />
                    Download file
                  </button>
                </div>
              )
            ) : (
              <p className="text-white">Failed to load file</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReceipt;



