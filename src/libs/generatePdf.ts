// lib/generatePdf.ts
import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(html: string) {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	try {
		const page = await browser.newPage();
		await page.setContent(html, {
			waitUntil: 'networkidle0'
		});

		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20mm',
				right: '20mm',
				bottom: '20mm',
				left: '20mm'
			}
		});

		return pdf;
	} finally {
		await browser.close();
	}
}