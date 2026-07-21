// Client-side PDF text extraction using pdfjs-dist
import * as pdfjs from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

let inited = false;
function init() {
  if (inited) return;
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  inited = true;
}

export async function extractPdf(file: File): Promise<{ text: string; pageCount: number; pages: string[] }> {
  init();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    pages.push(text);
  }
  return { text: pages.join("\n\n"), pageCount: doc.numPages, pages };
}
