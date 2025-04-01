import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import dynamic from "next/dynamic";

// Dynamically import react-json-view to ensure it only runs on the client side
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

interface RenderQRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
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
        <div className="p-4">
            <div className="flex justify-center items-center p-4">
                <QRCodeCanvas
                    value={value}
                    size={size}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    level={level}
                />
            </div>
            {ReactJson && (
                <div className="max-w-full overflow-auto">
                    <ReactJson
                        src={{ value }}
                        theme="monokai"
                        collapsed={false}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        style={{ width: "100%", wordBreak: "break-word" }}
                    />
                </div>
            )}
        </div>
    );
};

export default RenderQRCode;
