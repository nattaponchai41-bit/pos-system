function sanitize(value: string): string {
  return value.replace(/\D/g, '')
}

function withLength(id: string): string {
  const len = String(id.length).padStart(2, '0')
  return len + id
}

function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
  }
  crc &= 0xffff
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function generatePromptPayPayload(id: string, amount?: number): string {
  const clean = sanitize(id)

  let merchantId: string
  if (clean.length === 10) {
    // Mobile number: country code 66 + leading 0 stripped
    const national = clean.startsWith('0') ? clean.slice(1) : clean
    const phone = '0066' + national
    merchantId = '01' + withLength(phone)
  } else if (clean.length === 13) {
    // Thai national ID
    merchantId = '02' + withLength(clean)
  } else if (clean.length === 15) {
    // e-Wallet ID
    merchantId = '03' + withLength(clean)
  } else {
    throw new Error('รองรับเฉพาะเบอร์โทรศัพท์ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ e-Wallet ID 15 หลัก')
  }

  // Payload Format Indicator
  const pfi = '000201'
  // Point of Initiation Method (11 = static, 12 = dynamic)
  const poim = '010211'
  // Merchant Account Information
  const merchantInfo = '2937' + '0016A000000677010111' + merchantId

  let payload = pfi + poim + merchantInfo

  // Country Code
  payload += '5303764'
  // Transaction Currency (764 = THB)
  payload += '5802TH'

  if (amount !== undefined && amount > 0) {
    // Transaction Amount
    const amountStr = Number(amount).toFixed(2)
    payload += '5406' + amountStr
  }

  // CRC placeholder
  payload += '6304'
  const checksum = crc16(payload)
  return payload + checksum
}

export function validatePromptPayId(id: string): { valid: boolean; message?: string; clean?: string } {
  const clean = sanitize(id)
  if (!clean) return { valid: false, message: 'กรุณากรอกเบอร์โทรศัพท์หรือเลขบัตรประชาชน' }
  if (![10, 13, 15].includes(clean.length)) {
    return { valid: false, message: 'รองรับเฉพาะเบอร์โทรศัพท์ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ e-Wallet ID 15 หลัก' }
  }
  return { valid: true, clean }
}
