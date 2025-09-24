"use client"

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

export function exportToCSV(rows: Record<string, any>[], filename = "export.csv", headers?: string[]) {
  const data = Array.isArray(rows) ? rows : []

  if (data.length === 0) {
    const csv = "Veri yok"
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    downloadBlob(filename, blob)
    return
  }

  const keys = headers || Object.keys(data[0] || {})
  const csvContent = [
    keys.join(","),
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key] ?? ""
          const stringValue = String(value)
          return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  downloadBlob(filename, blob)
}
