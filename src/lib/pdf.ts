'use client'

import pdfMake from 'pdfmake/build/pdfmake'
import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'

interface FontRegistry {
  normal: string
  bold: string
  italics: string
  bolditalics: string
}

const fontCache = new Map<string, FontRegistry>()

async function loadFont(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load font: ${url}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      if (base64) resolve(base64)
      else reject(new Error('Failed to encode font'))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function ensureThaiFonts(): Promise<void> {
  if (fontCache.has('Sarabun')) return
  const [regular, bold] = await Promise.all([
    loadFont('/fonts/Sarabun-Regular.ttf'),
    loadFont('/fonts/Sarabun-Bold.ttf'),
  ])
  fontCache.set('Sarabun', {
    normal: regular,
    bold,
    italics: regular,
    bolditalics: bold,
  })
}

function getFontConfig() {
  const fonts = fontCache.get('Sarabun')
  if (!fonts) throw new Error('Thai fonts not loaded')
  return {
    vfs: {
      'Sarabun-Regular.ttf': fonts.normal,
      'Sarabun-Bold.ttf': fonts.bold,
    },
    fonts: {
      Sarabun: {
        normal: 'Sarabun-Regular.ttf',
        bold: 'Sarabun-Bold.ttf',
        italics: 'Sarabun-Regular.ttf',
        bolditalics: 'Sarabun-Bold.ttf',
      },
    },
  }
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Cell = TableCell

function buildTable(header: Cell[], rows: Cell[][], options: { widths?: ('*' | number)[] } = {}): ContentTable {
  return {
    table: {
      widths: options.widths ?? Array(header.length).fill('*'),
      body: [header.map((h) => ({ text: h, style: 'tableHeader' }) as Cell), ...rows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1',
      fillColor: (i: number) => (i === 0 ? '#f1f5f9' : null),
    },
  }
}

interface PurchaseOrderPDF {
  orderNumber: string
  total: number | string
  note?: string | null
  createdAt: string
  supplier: { code: string; name: string } | null
  createdBy: { name: string } | null
  items: {
    product: { code: string; name: string }
    productUnit: { unit: { name: string } }
    quantity: number | string
    unitPrice: number | string
    total: number | string
  }[]
}

export async function downloadPurchaseOrderPDF(order: PurchaseOrderPDF) {
  await ensureThaiFonts()
  const { vfs, fonts } = getFontConfig()

  const content: Content[] = [
    { text: 'ใบสั่งซื้อ', style: 'title', alignment: 'center' },
    { text: order.orderNumber, style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 16] },
    {
      columns: [
        { width: '*', stack: [{ text: 'ผู้ขาย', style: 'label' }, order.supplier ? `${order.supplier.code} - ${order.supplier.name}` : '-'] },
        { width: '*', stack: [{ text: 'วันที่', style: 'label' }, new Date(order.createdAt).toLocaleString('th-TH')] },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 8],
    },
    {
      columns: [
        { width: '*', stack: [{ text: 'บันทึกโดย', style: 'label' }, order.createdBy?.name ?? '-'] },
      ],
      margin: [0, 0, 0, 8],
    },
  ]

  if (order.note) {
    content.push({ text: 'หมายเหตุ', style: 'label', margin: [0, 0, 0, 2] })
    content.push({ text: order.note, margin: [0, 0, 0, 12] })
  }

  content.push(
    buildTable(
      ['สินค้า', 'จำนวน', 'ราคาซื้อ/หน่วย', 'รวม'],
      order.items.map((item) => [
        { stack: [{ text: item.product.name }, { text: item.product.code, style: 'muted' }] },
        `${Number(item.quantity)} ${item.productUnit.unit.name}`,
        `${fmt(Number(item.unitPrice))} ฿`,
        `${fmt(Number(item.total))} ฿`,
      ]),
      { widths: ['*', 70, 80, 80] }
    )
  )

  content.push({
    columns: [
      { width: '*', text: '' },
      { width: 'auto', text: `ยอดรวม ${fmt(Number(order.total))} ฿`, style: 'total', alignment: 'right', margin: [0, 12, 0, 0] },
    ],
  })

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: { font: 'Sarabun', fontSize: 11 },
    styles: {
      title: { fontSize: 20, bold: true },
      subtitle: { fontSize: 13, bold: true },
      label: { fontSize: 10, color: '#64748b', margin: [0, 0, 0, 2] },
      muted: { fontSize: 9, color: '#64748b' },
      tableHeader: { bold: true, fontSize: 11 },
      total: { bold: true, fontSize: 14 },
    },
    pageSize: 'A4',
    pageMargins: [14, 14, 14, 14],
  }

  pdfMake.addFontContainer({ vfs, fonts })
  pdfMake.createPdf(docDefinition).download(`purchase-order-${order.orderNumber}.pdf`)
}

interface SessionReport {
  session: {
    id: string
    openedAt: string
    closedAt?: string
    openingCash: number | string
    expectedCash: number | string
    actualCash?: number | string | null
    difference?: number | string | null
    openedBy: { name: string }
    closedBy?: { name: string }
  }
  movements: Record<string, { sum: number; count: number }>
  movementDetails: {
    id: string
    type: string
    amount: number
    reason: string | null
    createdAt: string
    createdBy: string
  }[]
  recomputedExpected: number
  cashSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  transferSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  qrSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  creditSales: { count: number; total: number; cost: number; profit: number; marginPercent: number }
  debtPayments: {
    count: number
    total: number
    items: {
      invoiceNumber: string
      customerName: string
      amount: number
      method: string
      reference: string | null
      createdAt: string
    }[]
  }
  itemizedSales: {
    productId: string
    productCode: string
    productName: string
    unitName: string
    quantity: number
    total: number
    cost: number
    profit: number
  }[]
  invoiceList: {
    id: string
    invoiceNumber: string
    type: 'CASH' | 'TRANSFER' | 'QR' | 'CREDIT'
    total: number
    createdAt: string
    customer?: { name: string }
    createdBy?: { name: string }
    items: {
      product: { code: string; name: string }
      productUnit: { unit: { name: string } }
      quantity: number
      unitPrice: number
      total: number
    }[]
    payments: { method: string; amount: number }[]
  }[]
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'ธนาคาร',
  QR: 'พร้อมเพย์',
}

const MOVEMENT_LABELS: Record<string, string> = {
  CASH_IN: 'เงินเข้า',
  CASH_OUT: 'เงินออก',
  EXPENSE: 'ค่าใช้จ่าย',
  REFUND: 'คืนเงิน',
  DEBT_PAYMENT: 'รับชำระหนี้',
}

export async function downloadSessionPDF(report: SessionReport) {
  await ensureThaiFonts()
  const { vfs, fonts } = getFontConfig()

  const s = report.session
  const totalProfit = report.cashSales.profit + report.transferSales.profit + report.qrSales.profit + report.creditSales.profit
  const totalSales = report.cashSales.total + report.transferSales.total + report.qrSales.total + report.creditSales.total
  const totalMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

  const content: Content[] = [
    { text: 'สรุปยอดปิดกะ', style: 'title', alignment: 'center' },
    {
      text: `เปิดกะ: ${new Date(s.openedAt).toLocaleString('th-TH')} โดย ${s.openedBy.name}`,
      alignment: 'center',
      fontSize: 10,
      margin: [0, 4, 0, 2],
    },
  ]

  if (s.closedAt) {
    content.push({
      text: `ปิดกะ: ${new Date(s.closedAt).toLocaleString('th-TH')} โดย ${s.closedBy?.name ?? '-'}`,
      alignment: 'center',
      fontSize: 10,
      margin: [0, 0, 0, 12],
    })
  } else {
    content.push({ margin: [0, 0, 0, 12], text: '' })
  }

  content.push(
    buildTable(
      ['รายการ', 'จำนวนเงิน'],
      [
        ['เงินเปิดกะ', `${fmt(Number(s.openingCash))} ฿`],
        ['เงินที่ควรมี (ระบบ)', `${fmt(Number(s.expectedCash))} ฿`],
        ['เงินที่นับได้', `${fmt(Number(s.actualCash ?? 0))} ฿`],
        ['ต่าง', `${fmt(Number(s.difference ?? 0))} ฿`],
      ]
    )
  )

  content.push({ text: 'คำนวณเงินที่ควรมี', style: 'section', margin: [0, 12, 0, 6] })
  content.push(
    buildTable(
      ['รายการ', 'จำนวนเงิน'],
      [
        ['เงินเปิดกะ', `${fmt(Number(s.openingCash))} ฿`],
        ...Object.entries(report.movements).map(([type, data]) => [
          MOVEMENT_LABELS[type] ?? type,
          { text: `${fmt(data.sum)} ฿`, color: data.sum < 0 ? '#dc2626' : '#16a34a' },
        ]),
        [
          { text: 'คำนวณได้', bold: true },
          { text: `${fmt(report.recomputedExpected)} ฿`, bold: true, color: report.recomputedExpected !== Number(s.expectedCash) ? '#dc2626' : '#0f172a' },
        ],
      ]
    )
  )
  if (report.recomputedExpected !== Number(s.expectedCash)) {
    content.push({
      text: '* ตัวเลขคำนวณไม่ตรงกับเงินที่ควรมีในระบบ อาจมีการแก้ไขฐานข้อมูลโดยตรงหรือรายการคำนวณผิดพลาด',
      color: '#dc2626',
      fontSize: 9,
      margin: [0, 4, 0, 0],
    })
  }

  content.push({ text: 'สรุปยอดขาย', style: 'section', margin: [0, 16, 0, 6] })
  content.push(
    buildTable(
      ['ประเภท', 'จำนวน', 'ยอดรวม', 'กำไร'],
      [
        ['ขายเงินสด', `${report.cashSales.count} รายการ`, `${fmt(report.cashSales.total)} ฿`, `${fmt(report.cashSales.profit)} ฿`],
        ['ขายโอนเงิน', `${report.transferSales.count} รายการ`, `${fmt(report.transferSales.total)} ฿`, `${fmt(report.transferSales.profit)} ฿`],
        ['ขายพร้อมเพย์', `${report.qrSales.count} รายการ`, `${fmt(report.qrSales.total)} ฿`, `${fmt(report.qrSales.profit)} ฿`],
        ['ขายเครดิต', `${report.creditSales.count} รายการ`, `${fmt(report.creditSales.total)} ฿`, `${fmt(report.creditSales.profit)} ฿`],
        ['รับชำระหนี้', `${report.debtPayments.count} รายการ`, `${fmt(report.debtPayments.total)} ฿`, '-'],
      ]
    )
  )

  content.push({ text: `กำไรรวม: ${fmt(totalProfit)} ฿ (${fmt(totalMargin)}%)`, bold: true, margin: [0, 6, 0, 0] })

  if (Object.keys(report.movements).length > 0) {
    content.push({ text: 'ความเคลื่อนไหวเงินสด', style: 'section', margin: [0, 16, 0, 6] })
    content.push(
      buildTable(
        ['ประเภท', 'จำนวนครั้ง', 'ยอดรวม'],
        Object.entries(report.movements).map(([type, data]) => [MOVEMENT_LABELS[type] ?? type, String(data.count), `${fmt(data.sum)} ฿`])
      )
    )
  }

  if (report.movementDetails.length > 0) {
    content.push({ text: `รายการความเคลื่อนไหวเงินสด (${report.movementDetails.length} รายการ)`, style: 'section', margin: [0, 12, 0, 6] })
    content.push(
      buildTable(
        ['เวลา', 'ประเภท', 'ยอด', 'เหตุผล', 'บันทึกโดย'],
        report.movementDetails.map((m) => [
          new Date(m.createdAt).toLocaleString('th-TH'),
          MOVEMENT_LABELS[m.type] ?? m.type,
          { text: `${fmt(m.amount)} ฿`, color: m.amount < 0 ? '#dc2626' : '#16a34a' },
          m.reason ?? '-',
          m.createdBy,
        ]),
        { widths: ['*', 60, 60, '*', 70] }
      )
    )
  }

  content.push({ text: 'สินค้าที่ขายไป (รวม)', style: 'section', margin: [0, 16, 0, 6] })
  content.push(
    buildTable(
      ['รหัส', 'สินค้า', 'หน่วย', 'จำนวน', 'ยอดรวม', 'กำไร'],
      report.itemizedSales.map((item) => [
        item.productCode,
        item.productName,
        item.unitName,
        String(item.quantity),
        `${fmt(item.total)} ฿`,
        `${fmt(item.profit)} ฿`,
      ]),
      { widths: [70, '*', 50, 45, 65, 65] }
    )
  )

  if (report.debtPayments.items.length > 0) {
    content.push({ text: `รายการรับชำระหนี้ (${report.debtPayments.items.length} รายการ)`, style: 'section', pageBreak: 'before', margin: [0, 0, 0, 6] })
    content.push(
      buildTable(
        ['เลขบิล', 'ลูกค้า', 'ยอด', 'วิธี', 'อ้างอิง', 'เวลา'],
        report.debtPayments.items.map((dp) => [
          dp.invoiceNumber,
          dp.customerName,
          `${fmt(dp.amount)} ฿`,
          METHOD_LABELS[dp.method] ?? dp.method,
          dp.reference ?? '-',
          new Date(dp.createdAt).toLocaleString('th-TH'),
        ]),
        { widths: [70, '*', 55, 50, 55, '*'] }
      )
    )
  }

  content.push({ text: `รายการบิล (${report.invoiceList.length} รายการ)`, style: 'section', pageBreak: 'before', margin: [0, 0, 0, 6] })
  content.push(
    buildTable(
      ['เลขบิล', 'เวลา', 'ประเภท', 'ลูกค้า', 'ยอด'],
      report.invoiceList.map((inv) => [
        inv.invoiceNumber,
        new Date(inv.createdAt).toLocaleString('th-TH'),
        inv.type === 'CASH' ? 'เงินสด' : inv.type === 'TRANSFER' ? 'ธนาคาร' : inv.type === 'QR' ? 'พร้อมเพย์' : 'เครดิต',
        inv.customer?.name ?? '-',
        `${fmt(inv.total)} ฿`,
      ]),
      { widths: [70, '*', 55, '*', 65] }
    )
  )

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: { font: 'Sarabun', fontSize: 10 },
    styles: {
      title: { fontSize: 18, bold: true },
      section: { fontSize: 13, bold: true },
      tableHeader: { bold: true, fontSize: 10 },
    },
    pageSize: 'A4',
    pageMargins: [14, 14, 14, 14],
  }

  pdfMake.addFontContainer({ vfs, fonts })
  pdfMake.createPdf(docDefinition).download(`session-report-${s.id.slice(-6)}.pdf`)
}
