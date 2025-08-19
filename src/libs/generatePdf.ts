// lib/generatePdf.ts
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export async function generatePdfFromHtml(html: string) {
  const isProduction = process.env.NODE_ENV === "production";

  const browser = await puppeteer.launch({
    headless: true,
    args: isProduction
      ? chromium.args
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
    defaultViewport: isProduction ? { width: 1280, height: 720 } : undefined,
    executablePath: isProduction
      ? await chromium.executablePath()
      : process.env.CHROME_EXECUTABLE_PATH ||
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
