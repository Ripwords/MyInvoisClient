import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decodeTaxpayerIdentity,
  getTaxpayerIdentity,
  MyInvoisApiError,
} from '../../src/index'

const b64url = (s: string) => Buffer.from(s).toString('base64url')
/** A token shaped like LHDN's: header.payload.signature, unpadded base64url. */
const jwt = (payload: unknown) =>
  `${b64url('{"alg":"RS256","typ":"JWT"}')}.${b64url(JSON.stringify(payload))}.c2ln`

describe('decodeTaxpayerIdentity', () => {
  it('reads the represented taxpayer from an LHDN token', () => {
    expect(
      decodeTaxpayerIdentity(
        jwt({
          TaxpayerTIN: 'C25845632020',
          name: 'Kedai Ann Sdn Bhd',
          IsIntermediary: 'False',
          client_id: 'abc',
        }),
      ),
    ).toEqual({ tin: 'C25845632020', name: 'Kedai Ann Sdn Bhd', isIntermediary: false })
  })

  it('decodes base64url that uses - and _ and has no padding', () => {
    // These characters in the name make the payload's base64url contain - and _.
    const name = 'Kedai ÿÿ>>??~~ Sdn Bhd'
    const token = jwt({ TaxpayerTIN: 'C1', name })
    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(token.split('.')[1]).not.toContain('=')
    expect(decodeTaxpayerIdentity(token).name).toBe(name)
  })

  it('trims and upper-cases the TIN so it compares with what people type', () => {
    expect(decodeTaxpayerIdentity(jwt({ TaxpayerTIN: ' c123 ' })).tin).toBe('C123')
  })

  it.each([
    ['True', true],
    ['true', true],
    [true, true],
    ['False', false],
    [false, false],
    [undefined, false],
  ])('reads IsIntermediary %j as %j', (value, expected) => {
    expect(
      decodeTaxpayerIdentity(jwt({ TaxpayerTIN: 'C1', IsIntermediary: value })).isIntermediary,
    ).toBe(expected)
  })

  it.each([
    ['no segments', 'not-a-token'],
    ['two segments', `${b64url('{}')}.${b64url('{"TaxpayerTIN":"C1"}')}`],
    ['an empty payload', `${b64url('{}')}..c2ln`],
    ['a payload that is not JSON', `${b64url('{}')}.${b64url('TaxpayerTIN=C1')}.c2ln`],
    ['a payload of bytes', `${b64url('{}')}.@@@@.c2ln`],
    ['a JSON array', jwt(['C1'])],
    ['JSON null', jwt(null)],
    ['no TaxpayerTIN', jwt({ name: 'Kedai Ann' })],
    ['an empty TaxpayerTIN', jwt({ TaxpayerTIN: '  ' })],
    ['a numeric TaxpayerTIN', jwt({ TaxpayerTIN: 123 })],
  ])('refuses a token with %s', (_, token) => {
    expect(() => decodeTaxpayerIdentity(token)).toThrow(/taxpayer/i)
  })
})

describe('getTaxpayerIdentity', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('logs in as a taxpayer system, without onbehalfof, and reads the token', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init })
        return Response.json({
          access_token: jwt({ TaxpayerTIN: 'C25845632020', IsIntermediary: 'False' }),
          expires_in: 3600,
        })
      }),
    )
    const identity = await getTaxpayerIdentity({
      clientId: 'id-unit-1',
      clientSecret: 'secret',
      environment: 'sandbox',
    })
    expect(identity).toEqual({ tin: 'C25845632020', name: undefined, isIntermediary: false })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://preprod-api.myinvois.hasil.gov.my/connect/token')
    expect(Object.keys(calls[0]!.init.headers as object)).not.toContain('onbehalfof')
    expect(new URLSearchParams(calls[0]!.init.body as URLSearchParams).get('client_id')).toBe(
      'id-unit-1',
    )
  })

  it('passes a refused login through as MyInvoisApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'invalid_client', error_description: 'invalid_client' }, {
          status: 400,
        }),
      ),
    )
    await expect(
      getTaxpayerIdentity({ clientId: 'id-unit-2', clientSecret: 'x', environment: 'sandbox' }),
    ).rejects.toBeInstanceOf(MyInvoisApiError)
  })
})
