import { startTunnel } from "untun";

console.log("==========================================================");
console.log("     URBANPULSE SMART CITY: CLOUDFLARE PUBLIC TUNNEL      ");
console.log("==========================================================");
console.log("Menghubungkan localhost:3000 ke jaringan internet publik...");

try {
  const tunnel = await startTunnel({ port: 3000 });
  const url = await tunnel.getURL();
  console.log("\n>>> TUNNEL BERHASIL AKTIF! <<<");
  console.log("Link Publik Dashboard:", url);
  console.log("\nBuka link di atas melalui browser HP atau perangkat apa pun!");
  console.log("Tekan Ctrl+C untuk menghentikan tunnel.\n");
} catch (err) {
  console.error("Gagal mengaktifkan tunnel:", err);
}
