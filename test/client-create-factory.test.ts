import { describe, expect, it } from 'vitest'
import { MyInvoisClient } from '../src/index'
import { readFileSync } from 'node:fs'

const certificatePem = readFileSync('myinvois-test-cert.pem', 'utf8')
const privateKeyPem = readFileSync('myinvois-test-key.pem', 'utf8')

describe('MyInvoisClient.create', () => {
  it('builds a client from an options object', () => {
    const client = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
    })
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('accepts debug without requiring a placeholder for onBehalfOf', () => {
    const client = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
      debug: true,
    })
    expect(client).toBeInstanceOf(MyInvoisClient)
  })

  it('produces a client equivalent to the positional constructor', () => {
    const viaFactory = MyInvoisClient.create({
      clientId: 'id',
      clientSecret: 'secret',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
      onBehalfOf: 'TIN123',
    })
    const viaConstructor = new MyInvoisClient(
      'id',
      'secret',
      'sandbox',
      certificatePem,
      privateKeyPem,
      'TIN123',
    )
    // Compare both structure and values by spreading to access private fields
    expect({ ...viaFactory }).toEqual({ ...viaConstructor })
  })

  it('does not transpose clientId and clientSecret', () => {
    const client = MyInvoisClient.create({
      clientId: 'THE-CLIENT-ID',
      clientSecret: 'THE-CLIENT-SECRET',
      environment: 'sandbox',
      certificatePem,
      privateKeyPem,
    })
    const fields = { ...client } as Record<string, unknown>
    expect(fields.clientId).toBe('THE-CLIENT-ID')
    expect(fields.clientSecret).toBe('THE-CLIENT-SECRET')
  })

  it('still rejects a mismatched certificate and key', () => {
    expect(() =>
      MyInvoisClient.create({
        clientId: 'id',
        clientSecret: 'secret',
        environment: 'sandbox',
        certificatePem,
        privateKeyPem: privateKeyPem.replace(/A/, 'B'),
      }),
    ).toThrow()
  })
})
