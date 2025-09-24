import { NextResponse } from "next/server"

// TCMB (Merkez Bankası) today.xml'den USD/TRY ve SAR/TRY çekiyoruz.
// Değerleri her zaman 1 birim bazında döndürüyoruz (Unit ile ölçek).
// Başarısız olursa exchangerate.host ve Frankfurter'a düşer.

// Nokta/virgül ayracını akıllıca algıla ve sayıya çevir.
function parseDecimalSmart(input: string) {
  let s = (input || "").trim().replace(/\u00A0/g, "")
  const hasComma = s.includes(",")
  const hasDot = s.includes(".")
  if (hasComma && hasDot) {
    // Son görülen ayıracı "ondalık" kabul et
    const lastComma = s.lastIndexOf(",")
    const lastDot = s.lastIndexOf(".")
    if (lastComma > lastDot) {
      // Virgül ondalık -> binlik noktaları sil, virgülü noktaya çevir
      s = s.replace(/\./g, "").replace(",", ".")
    } else {
      // Nokta ondalık -> binlik virgülleri sil
      s = s.replace(/,/g, "")
    }
  } else if (hasComma) {
    // Sadece virgül -> virgül ondalık
    s = s.replace(/\./g, "").replace(",", ".")
  } // sadece nokta ise direkt parse edilir
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function extractTag(block: string, tag: string): string {
  const open = `<${tag}>`
  const close = `</${tag}>`
  const i1 = block.indexOf(open)
  if (i1 === -1) return ""
  const i2 = block.indexOf(close, i1 + open.length)
  if (i2 === -1) return ""
  return block.slice(i1 + open.length, i2).trim()
}

function findCurrencyBlock(xml: string, code: string): string {
  // Kod="USD" veya Kod='USD'
  const needle1 = `Kod="${code}"`
  const needle2 = `Kod='${code}'`
  let pos = xml.indexOf(needle1)
  if (pos === -1) pos = xml.indexOf(needle2)
  if (pos === -1) return ""
  const start = xml.lastIndexOf("<Currency", pos)
  const end = xml.indexOf("</Currency>", pos)
  if (start === -1 || end === -1) return ""
  return xml.slice(start, end + "</Currency>".length)
}

// 1 birim başına kur = satış / unit
function parseTCMB(xml: string) {
  function pick(code: "USD" | "SAR") {
    const block = findCurrencyBlock(xml, code)
    if (!block) return 0
    const unitStr = extractTag(block, "Unit")
    const unit = Math.max(1, parseInt(unitStr || "1", 10) || 1)

    const forexSelling = extractTag(block, "ForexSelling")
    const banknoteSelling = extractTag(block, "BanknoteSelling")
    const raw = forexSelling || banknoteSelling || ""
    const rate = parseDecimalSmart(raw)

    if (!isFinite(rate) || rate <= 0) return 0
    return rate / unit
  }

  const USDTRY = pick("USD")
  const SARTRY = pick("SAR")
  return { USDTRY, SARTRY }
}

async function fetchTCMB() {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { cache: "no-store" })
    if (!res.ok) throw new Error("TCMB fetch failed")
    const xml = await res.text()
    const { USDTRY, SARTRY } = parseTCMB(xml)
    return {
      USDTRY: isFinite(USDTRY) && USDTRY > 0 ? USDTRY : 0,
      SARTRY: isFinite(SARTRY) && SARTRY > 0 ? SARTRY : 0,
      source: "tcmb" as const,
    }
  } catch {
    return { USDTRY: 0, SARTRY: 0, source: "tcmb" as const }
  }
}

async function fetchExchangerateHost() {
  try {
    const r1 = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TRY", { cache: "no-store" })
    const j1 = await r1.json()
    const USDTRY: number = Number(j1?.rates?.TRY) || 0

    const r2 = await fetch("https://api.exchangerate.host/latest?base=SAR&symbols=TRY", { cache: "no-store" })
    const j2 = await r2.json()
    const SARTRY: number = Number(j2?.rates?.TRY) || 0

    return { USDTRY, SARTRY, source: "exchangerate.host" as const }
  } catch {
    return { USDTRY: 0, SARTRY: 0, source: "exchangerate.host" as const }
  }
}

async function fetchFrankfurter() {
  try {
    const r1 = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY", { cache: "no-store" })
    const j1 = await r1.json()
    const USDTRY: number = Number(j1?.rates?.TRY) || 0

    const r2 = await fetch("https://api.frankfurter.app/latest?from=SAR&to=TRY", { cache: "no-store" })
    const j2 = await r2.json()
    const SARTRY: number = Number(j2?.rates?.TRY) || 0

    return { USDTRY, SARTRY, source: "frankfurter" as const }
  } catch {
    return { USDTRY: 0, SARTRY: 0, source: "frankfurter" as const }
  }
}

export async function GET() {
  // Önce TCMB, sonra exchangerate.host, en son Frankfurter
  let { USDTRY, SARTRY, source } = await fetchTCMB()

  if (!USDTRY || !SARTRY) {
    const f = await fetchExchangerateHost()
    USDTRY = USDTRY || f.USDTRY
    SARTRY = SARTRY || f.SARTRY
    if (!source || (!USDTRY || !SARTRY)) source = f.source
  }

  if (!USDTRY || !SARTRY) {
    const f2 = await fetchFrankfurter()
    USDTRY = USDTRY || f2.USDTRY
    SARTRY = SARTRY || f2.SARTRY
    if (!source || (!USDTRY || !SARTRY)) source = f2.source
  }

  // 1 USD = ? SAR
  const USDSAR = USDTRY && SARTRY ? USDTRY / SARTRY : 0

  return NextResponse.json({
    USDTRY,
    SARTRY,
    USDSAR,
    fetchedAt: Date.now(),
    source: source || "tcmb",
  })
}
