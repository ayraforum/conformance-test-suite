import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export interface RenderQRCodeProps {
    /** The data to encode in the QR code */
    value: string;
    /** Size of the QR code in pixels */
    size?: number;
    /** Background color of the QR code */
    bgColor?: string;
    /** Foreground color (QR code color) */
    fgColor?: string;
    /** Error correction level: L, M, Q, or H */
    level?: "L" | "M" | "Q" | "H";
}

const RenderQRCode: React.FC<RenderQRCodeProps> = ({
    value,
    size = 128,
    bgColor = "#ffffff",
    fgColor = "#000000",
    level = "M",
}) => {
    return (
        <div className="flex justify-center items-center p-4">
            <QRCodeCanvas
                value={value}
                size={size}
                bgColor={bgColor}
                fgColor={fgColor}
                level={level}
            />
        </div>
    );
};

export default RenderQRCode;
