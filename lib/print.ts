"use client"

export function printTable(title: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("Yazdırılacak veri yok")
    return
  }

  const headers = Object.keys(rows[0])
  const tableRows = rows
    .map((row) => headers.map((header) => String(row[header] || "")).join("</td><td>"))
    .map((row) => `<tr><td>${row}</td></tr>`)
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }
}
