import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeProps {
  text: string;
  size?: number; // Optional size parameter
}

const QRCodeGenerator: React.FC<QRCodeProps> = ({ text, size = 256 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, text, { width: size }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
        }
      });
    }
  }, [text, size]);

  return <canvas ref={canvasRef} />;
};

export default QRCodeGenerator;
