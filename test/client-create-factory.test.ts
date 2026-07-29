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
    expect(Object.keys(viaFactory)).toEqual(Object.keys(viaConstructor))
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
