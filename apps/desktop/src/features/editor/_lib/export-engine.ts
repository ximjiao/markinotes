import type { ExportType, NoteDocument } from "../_types/editor.types";
import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";

/**
 * Triggers export for PDF, DOCX, Markdown, or Plain Text.
 */
export async function exportDocument(
  doc: NoteDocument,
  htmlContent: string,
  type: ExportType
) {
  const fileName = (doc.frontmatter.title || "document")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
    
  const tauriEnv = isTauri();

  if (type === "md") {
    if (tauriEnv) {
      const path = await save({ defaultPath: `${fileName}.md`, filters: [{ name: "Markdown", extensions: ["md"] }] });
      if (path) await writeTextFile(path, doc.content);
    } else {
      downloadBlob(`${fileName}.md`, doc.content, "text/markdown;charset=utf-8");
    }
  } else if (type === "txt") {
    if (tauriEnv) {
      const path = await save({ defaultPath: `${fileName}.txt`, filters: [{ name: "Text", extensions: ["txt"] }] });
      if (path) await writeTextFile(path, doc.content);
    } else {
      downloadBlob(`${fileName}.txt`, doc.content, "text/plain;charset=utf-8");
    }
  } else if (type === "docx") {
    const htmlDoc = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${doc.frontmatter.title || "Document"}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        h1, h2, h3 { color: #111; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
        blockquote { border-left: 4px solid #ccc; padding-left: 10px; color: #666; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
      </style>
      </head>
      <body>
        <h1>${doc.frontmatter.title || "Untitled"}</h1>
        ${htmlContent}
      </body>
      </html>
    `;
    if (tauriEnv) {
      const path = await save({ defaultPath: `${fileName}.doc`, filters: [{ name: "Word Document", extensions: ["doc"] }] });
      if (path) await writeTextFile(path, htmlDoc);
    } else {
      downloadBlob(`${fileName}.doc`, htmlDoc, "application/msword;charset=utf-8");
    }
  } else if (type === "pdf") {
    if (tauriEnv) {
      // In Tauri, generate PDF using html2pdf and save it via plugin-fs
      const path = await save({ defaultPath: `${fileName}.pdf`, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (path) {
        try {
          const html2pdf = (await import('html2pdf.js')).default;
          const element = document.createElement('div');
          element.innerHTML = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
              <h1 style="font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 24px; color: #0f172a;">${doc.frontmatter.title || "Untitled Note"}</h1>
              <div>${htmlContent}</div>
            </div>
          `;
          
          const opt = {
            margin:       15,
            filename:     `${fileName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await writeFile(path, uint8Array);
        } catch (err) {
          console.error("Failed to generate PDF:", err);
        }
      }
    } else {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${doc.frontmatter.title || "Document"}</title>
            <style>
              @page { margin: 20mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px; }
              h1 { font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 24px; color: #0f172a; }
              h2 { font-size: 20px; margin-top: 24px; color: #1e293b; }
              h3 { font-size: 16px; margin-top: 16px; color: #334155; }
              p { margin-bottom: 12px; }
              pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; }
              blockquote { border-left: 4px solid #9333ea; padding-left: 12px; color: #64748b; font-style: italic; margin: 16px 0; }
              table { width: 100%; border-collapse: collapse; margin: 16px 0; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
              th { background: #f1f5f9; font-weight: 600; }
              ul, ol { padding-left: 20px; margin-bottom: 12px; }
              li { margin-bottom: 4px; }
            </style>
          </head>
          <body>
            <h1>${doc.frontmatter.title || "Untitled Note"}</h1>
            <div>${htmlContent}</div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
