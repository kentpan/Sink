interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

const isCloudflare = process.env.NODE_ENV === 'production' || process.env.NUXT_USE_CLOUDFLARE === 'true'
const BASE64URL_REGEX = /[+/=]/g

async function getCrypto() {
  if (isCloudflare) {
    return { crypto: globalThis.crypto }
  }
  const nodeCrypto = await import('node:crypto')
  return { crypto: nodeCrypto.default }
}

async function getBuffer() {
  const { Buffer } = await import('node:buffer')
  return { Buffer }
}

export async function generateJwt(payload: JwtPayload, secret: string, expiresInMinutes: number = 60): Promise<string> {
  const { Buffer } = await getBuffer()
  const { crypto } = await getCrypto()

  const now = Math.floor(Date.now() / 1000)
  const exp = now + (expiresInMinutes * 60)

  function base64urlEncode(str: string): string {
    const encoded = Buffer.from(str)
    return encoded.toString('base64url')
  }

  async function sign(data: string, secretStr: string): Promise<string> {
    if (isCloudflare) {
      const encoder = new TextEncoder()
      const keyData = encoder.encode(secretStr)
      const key = await (crypto.subtle.importKey as (
        format: 'raw',
        keyData: ArrayBuffer,
        algorithm: { name: 'HMAC', hash: 'SHA-256' },
        extractable: boolean,
        keyUsages: ['sign'],
      ) => Promise<CryptoKey>)('raw', keyData.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
      return Buffer.from(sig).toString('base64url')
    }
    const nodeCrypto = crypto as typeof import('node:crypto')
    return nodeCrypto.createHmac('sha256', secretStr).update(data).digest('base64url')
  }

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadData = base64urlEncode(JSON.stringify({ ...payload, iat: now, exp }))
  const signature = await sign(`${header}.${payloadData}`, secret)

  return `${header}.${payloadData}.${signature}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const { Buffer } = await getBuffer()
    const { crypto } = await getCrypto()

    const [header, payload, signature] = token.split('.')

    if (!header || !payload || !signature) {
      return null
    }

    function base64urlDecode(str: string): string {
      return Buffer.from(str, 'base64url').toString('utf-8')
    }

    async function sign(data: string, secretStr: string): Promise<string> {
      if (isCloudflare) {
        const encoder = new TextEncoder()
        const key = await (crypto.subtle.importKey as (
          format: 'raw',
          keyData: ArrayBuffer,
          algorithm: { name: 'HMAC', hash: 'SHA-256' },
          extractable: boolean,
          keyUsages: ['sign'],
        ) => Promise<CryptoKey>)('raw', encoder.encode(secretStr).buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
        return Buffer.from(sig).toString('base64url')
      }
      const nodeCrypto = crypto as typeof import('node:crypto')
      return nodeCrypto.createHmac('sha256', secretStr).update(data).digest('base64url')
    }

    const expectedSignature = await sign(`${header}.${payload}`, secret)
    if (signature !== expectedSignature) {
      return null
    }

    const decodedPayload = JSON.parse(base64urlDecode(payload))

    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return decodedPayload
  }
  catch {
    return null
  }
}

export async function generateApiKey(): Promise<string> {
  const { crypto } = await getCrypto()

  if (isCloudflare) {
    const array = new Uint8Array(32)
    ;(crypto as Crypto).getRandomValues(array)
    return Array.from(array).map(b => String.fromCharCode(b)).join('').replace(BASE64URL_REGEX, c => ({ '+': '-', '/': '_', '=': '' }[c] || c))
  }
  const nodeCrypto = crypto as typeof import('node:crypto')
  return nodeCrypto.randomBytes(32).toString('base64url')
}
