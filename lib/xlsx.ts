"use client"

import { exportToCSV } from "@/lib/csv"

// Dynamically import SheetJS in the browser to avoid bundling issues.
async function loadXLSX() {
  try {
    const mod = await import("xlsx")
    return mod
  } catch (err) {
    console.error("xlsx import failed:", err)
    return null
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Export rows to XLSX; gracefully fall back to CSV if XLSX is unavailable.
export async function exportToXLSX(rows: Record<string, any>[], filename = "export.xlsx", headers?: string[]) {
  const data = Array.isArray(rows) ? rows : []
  const XLSX = await loadXLSX()
  const safeName = filename.toLowerCase().endsWith(".xlsx")
    ? filename
    : filename.replace(/\.csv$/i, "").replace(/\.xls$/i, "") + ".xlsx"

  if (!XLSX) {
    // Fallback to CSV with similar filename
    const csvName = safeName.replace(/\.xlsx$/i, ".csv")
    exportToCSV(data, csvName, headers)
    alert("Excel eklentisi yüklenemedi. CSV olarak dışa aktarıldı.")
    return
  }

  let worksheet: any
  if (headers && headers.length > 0) {
    const mapped = data.map((r) =>
      headers.reduce((acc, h) => {
        acc[h] = r[h]
        return acc
      }, {} as Record<string, any>)
    )
    worksheet = XLSX.utils.json_to_sheet(mapped, { header: headers })
  } else {
    worksheet = data.length > 0 ? XLSX.utils.json_to_sheet(data) : XLSX.utils.aoa_to_sheet([["Veri yok"]])
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1")

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true })
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  downloadBlob(safeName, blob)
}
