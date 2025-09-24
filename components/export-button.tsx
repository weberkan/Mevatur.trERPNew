"use client"

import { Button } from "@/components/ui/button"
import { exportToXLSX } from "@/lib/xlsx"
import { printTable } from "@/lib/print"
import { Download, Printer } from "lucide-react"

type Props = {
  filename?: string
  rows: Record<string, any>[]
  headers?: string[]
  mode?: "excel" | "print"
  title?: string
}

export default function ExportButton({
  filename = "export.xlsx",
  rows,
  headers,
  mode = "excel",
  title = "Rapor",
}: Props) {
  function handleClick() {
    if (mode === "print") {
      printTable(title, rows)
    } else {
      exportToXLSX(rows, filename, headers)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      {mode === "print" ? (
        <>
          <Printer className="h-4 w-4 mr-2" />
          Yazdır
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Excel'e Aktar
        </>
      )}
    </Button>
  )
}
