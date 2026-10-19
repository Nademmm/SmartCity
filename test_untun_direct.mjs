import { startTunnel } from "untun";

console.log("Memulai Cloudflare Quick Tunnel untuk port 3000...");
try {
  const tunnel = await startTunnel({ port: 3000 });
  const url = await tunnel.getURL();
  console.log("=================================================");
  console.log("TUNNEL BERHASIL AKTIF!");
  console.log("URL PUBLIK ANDA:", url);
  console.log("=================================================");
} catch (e) {
  console.error("Gagal start tunnel:", e);
}
