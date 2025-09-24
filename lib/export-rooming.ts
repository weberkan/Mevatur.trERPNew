import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx'

export interface RoomingExportData {
  groupName: string
  rooms: {
    name: string
    type: "2" | "3" | "4" | "5"
    occupants: {
      fullName: string
      roomType?: "2" | "3" | "4"
    }[]
  }[]
  unassigned: {
    fullName: string
    roomType?: "2" | "3" | "4"
  }[]
}

export async function exportToWord(data: RoomingExportData): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `${data.groupName} - Odalama Listesi`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
        
        // Odalar tablosu
        new Paragraph({
          text: "Oda Yerleşimi",
          heading: HeadingLevel.HEADING_2,
        }),
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Oda" })] }),
                new TableCell({ children: [new Paragraph({ text: "Tip" })] }),
                new TableCell({ children: [new Paragraph({ text: "Kişi Sayısı" })] }),
                new TableCell({ children: [new Paragraph({ text: "Katılımcılar" })] }),
              ],
            }),
            ...data.rooms.map(room => 
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: room.name })] }),
                  new TableCell({ children: [new Paragraph({ text: `${room.type}'li` })] }),
                  new TableCell({ children: [new Paragraph({ text: room.occupants.length.toString() })] }),
                  new TableCell({ 
                    children: room.occupants.length > 0 
                      ? room.occupants.map(occ => new Paragraph({ text: `• ${occ.fullName}${occ.roomType ? ` (${occ.roomType}'li)` : ''}` }))
                      : [new Paragraph({ text: "-" })]
                  }),
                ],
              })
            ),
          ],
        }),
        
        new Paragraph({ text: "" }),
        
        // Atanmamış kişiler
        new Paragraph({
          text: "Atanmamış Katılımcılar",
          heading: HeadingLevel.HEADING_2,
        }),
        ...(data.unassigned.length > 0 
          ? data.unassigned.map(p => 
              new Paragraph({ 
                text: `• ${p.fullName}${p.roomType ? ` (${p.roomType}'li)` : ''}`,
                bullet: { level: 0 }
              })
            )
          : [new Paragraph({ text: "Atanmamış katılımcı yok." })]
        ),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.groupName}-odalama-listesi.docx`
  link.click()
  URL.revokeObjectURL(url)
}



export function exportToHTML(data: RoomingExportData): void {
  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.groupName} - Odalama Listesi</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 20px; 
          background-color: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
          text-align: center; 
          margin-bottom: 30px; 
          color: #1f2937;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 15px;
        }
        h2 {
          color: #374151;
          margin-top: 30px;
          margin-bottom: 15px;
          border-left: 4px solid #3b82f6;
          padding-left: 15px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
          background: white;
        }
        th, td { 
          border: 1px solid #e5e7eb; 
          padding: 12px; 
          text-align: left; 
        }
        th { 
          background-color: #f3f4f6; 
          font-weight: 600;
          color: #374151;
        }
        tr:nth-child(even) { background-color: #f9fafb; }
        .unassigned-list {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 20px;
          margin-top: 20px;
        }
        .unassigned-list h3 {
          color: #dc2626;
          margin-top: 0;
        }
        .unassigned-list ul {
          margin: 0;
          padding-left: 20px;
        }
        .unassigned-list li {
          margin-bottom: 8px;
          color: #4b5563;
        }
        .room-type {
          color: #6b7280;
          font-size: 0.9em;
        }
        .occupant-count {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          font-weight: 500;
        }
        @media print { 
          body { margin: 0; background: white; }
          .container { box-shadow: none; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${data.groupName} - Odalama Listesi</h1>
        
        <h2>Oda Yerleşimi</h2>
        <table>
          <thead>
            <tr>
              <th>Oda</th>
              <th>Tip</th>
              <th>Kişi Sayısı</th>
              <th>Katılımcılar</th>
            </tr>
          </thead>
          <tbody>
            ${data.rooms.map(room => `
              <tr>
                <td><strong>${room.name}</strong></td>
                <td><span class="room-type">${room.type}'li</span></td>
                <td><span class="occupant-count">${room.occupants.length}</span></td>
                <td>
                  ${room.occupants.length > 0 
                    ? room.occupants.map(occ => 
                        `<div>• ${occ.fullName}${occ.roomType ? ` <span class="room-type">(${occ.roomType}'li)</span>` : ''}</div>`
                      ).join('')
                    : '<em>-</em>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${data.unassigned.length > 0 ? `
          <div class="unassigned-list">
            <h3>Atanmamış Katılımcılar (${data.unassigned.length})</h3>
            <ul>
              ${data.unassigned.map(person => 
                `<li>${person.fullName}${person.roomType ? ` <span class="room-type">(${person.roomType}'li)</span>` : ''}</li>`
              ).join('')}
            </ul>
          </div>
        ` : `
          <div class="unassigned-list" style="background: #f0fdf4; border-color: #bbf7d0;">
            <h3 style="color: #16a34a;">Tüm Katılımcılar Odalara Atandı!</h3>
            <p style="color: #15803d; margin: 0;">Atanmamış katılımcı bulunmamaktadır.</p>
          </div>
        `}
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  }
}
