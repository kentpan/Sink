import { Buffer } from 'node:buffer'
import * as crypto from 'node:crypto'

interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

function base64urlEncode(str: string | Buffer): string {
  const encoded = typeof str === 'string' ? Buffer.from(str) : str
  return encoded.toString('base64url')
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}

export function generateJwt(payload: JwtPayload, secret: string, expiresInMinutes: number = 60): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (expiresInMinutes * 60)

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadData = base64urlEncode(JSON.stringify({ ...payload, iat: now, exp }))
  const signature = sign(`${header}.${payloadData}`, secret)

  return `${header}.${payloadData}.${signature}`
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    const [header, payload, signature] = token.split('.')

    if (!header || !payload || !signature) {
      return null
    }

    const expectedSignature = sign(`${header}.${payload}`, secret)
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

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('base64url')
}
