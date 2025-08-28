import * as puppeteer from "puppeteer";
import * as chrome from "@sparticuz/chromium";
let browserPromise: Promise<puppeteer.Browser> | null = null;

async function getBrowser() {
    if (!browserPromise) {
        const isProduction = process.env.NODE_ENV === "production";

        let chromiumArgs: string[] = [];
        let chromiumExecutablePath: string | undefined;

        if (isProduction) {
            // Only import chromium in production
            const chromium = await chrome;
            chromiumArgs = chromium.default.args;
            chromiumExecutablePath = await chromium.default.executablePath();
        } else {
            chromiumArgs = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
            ];
            chromiumExecutablePath =
                process.env.CHROME_EXECUTABLE_PATH ||
                process.env.PUPPETEER_EXECUTABLE_PATH ||
                undefined;
        }

        browserPromise = puppeteer.launch({
            headless: true,
            args: chromiumArgs,
            defaultViewport: isProduction ? { width: 1280, height: 720 } : undefined,
            executablePath: chromiumExecutablePath,
        });
    }
    return browserPromise;
}

export async function generatePDFBuffer(html: string): Promise<Uint8Array> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setUserAgent("some user agent string");
        await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        return pdfBuffer;
    } finally {
        await page.close();
    }
}
