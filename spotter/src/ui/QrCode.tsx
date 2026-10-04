import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders text as a QR code SVG, generated locally. */
export function QrCode({
  text,
  label,
  className = "",
  margin = 2,
}: {
  text: string;
  label: string;
  className?: string;
  /** Quiet zone in modules. 0 when the caller draws its own exact-size border. */
  margin?: number;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin, color: { dark: "#000000", light: "#ffffff" } })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [text, margin]);
  return (
    <div
      role="img"
      aria-label={label}
      className={`bg-white [&>svg]:h-full [&>svg]:w-full ${className}`}
      // The SVG comes from the qrcode library, built from our own text.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
