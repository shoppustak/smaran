import path from "node:path";
import { fileURLToPath } from "node:url";

import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHATSAPP_NUMBER = "15551363612";
const MESSAGE = "नमस्ते स्मरण";
const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

const outPath = path.resolve(__dirname, "..", "public", "qr-whatsapp.png");

await QRCode.toFile(outPath, url, {
  width: 512,
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
});

console.log(`QR code written to ${outPath} for ${url}`);
