import React from 'react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface QRCodeViewerProps {
  value: string;
  size?: number;
}

const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ value, size = 256 }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
        setError('');
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code');
        setQrCodeUrl('');
      }
    };

    if (value) {
      generateQRCode();
    }
  }, [value, size]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-64 h-64 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!qrCodeUrl) {
    return (
      <div className="flex items-center justify-center w-64 h-64 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <img 
          src={qrCodeUrl} 
          alt="QR Code" 
          className="block"
          style={{ width: size, height: size }}
        />
      </div>
      <div className="max-w-md">
        <p className="text-xs text-gray-500 break-all font-mono bg-gray-50 p-2 rounded">
          {value.length > 100 ? `${value.substring(0, 100)}...` : value}
        </p>
      </div>
    </div>
  );
};

export default QRCodeViewer;
