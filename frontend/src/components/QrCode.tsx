import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { useI18n } from "../lib/i18n";

/** QR code dessiné en SVG (aucune image à télécharger), aux couleurs AlloDoc. */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const { t } = useI18n();
  const { count, cells } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: string[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) dark.push(`M${c} ${r}h1v1h-1z`);
      }
    }
    return { count: n, cells: dark.join("") };
  }, [value]);

  const margin = 2;
  return (
    <svg width={size} height={size} viewBox={`${-margin} ${-margin} ${count + margin * 2} ${count + margin * 2}`} role="img" aria-label={t("qr.label", { url: value })} shapeRendering="crispEdges">
      <rect x={-margin} y={-margin} width={count + margin * 2} height={count + margin * 2} fill="#fff" />
      <path d={cells} fill="#141640" />
    </svg>
  );
}
