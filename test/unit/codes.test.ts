import { describe, it, expect } from 'vitest'
import {
  TAX_TYPES,
  CLASSIFICATION_CODES,
  STATE_CODES,
  COUNTRY_CODES,
  CURRENCY_CODES,
  E_INVOICE_TYPES,
  PAYMENT_MODES,
  UNIT_TYPES,
  MSIC_CODES,
} from '../../src/codes'

const ALL_LISTS = {
  TAX_TYPES,
  CLASSIFICATION_CODES,
  STATE_CODES,
  COUNTRY_CODES,
  CURRENCY_CODES,
  E_INVOICE_TYPES,
  PAYMENT_MODES,
  UNIT_TYPES,
  MSIC_CODES,
} as const

describe('runtime code lists', () => {
  it('every list is non-empty with unique, non-empty codes', () => {
    for (const [name, list] of Object.entries(ALL_LISTS)) {
      expect(list.length, name).toBeGreaterThan(0)
      const codes = list.map((e) => e.code)
      expect(new Set(codes).size, `${name} has duplicate codes`).toBe(
        codes.length,
      )
      for (const entry of list) {
        expect(entry.code, name).toBeTruthy()
      }
    }
  })

  it('contains known official entries', () => {
    expect(TAX_TYPES).toContainEqual({ code: '01', description: 'Sales Tax' })
    expect(STATE_CODES).toContainEqual({
      code: '14',
      name: 'Wilayah Persekutuan Kuala Lumpur',
    })
    expect(CURRENCY_CODES).toContainEqual({
      code: 'MYR',
      name: 'Malaysian Ringgit',
    })
    expect(E_INVOICE_TYPES).toContainEqual({
      code: '01',
      description: 'Invoice',
    })
    expect(COUNTRY_CODES).toContainEqual({ code: 'MYS', name: 'MALAYSIA' })
  })

  it('MSIC entries carry a category reference', () => {
    const construction = MSIC_CODES.find((e) => e.code === '41001')
    expect(construction).toBeDefined()
    expect(construction!.categoryReference).toBe('F')
  })
})
