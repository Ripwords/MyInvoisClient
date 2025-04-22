import { describe, it, expect } from 'vitest'
import { encodeToBase64 } from '../src/utils/base64' // Adjust path if necessary

describe('encodeToBase64', () => {
  it('should correctly encode a simple JSON string', () => {
    const jsonString = '{"key": "value"}'
    const expectedBase64 = 'eyJrZXkiOiAidmFsdWUifQ==' // Buffer.from(jsonString).toString('base64')
    expect(encodeToBase64(jsonString)).toBe(expectedBase64)
  })

  it('should correctly encode a simple XML string', () => {
    const xmlString = '<root><element>value</element></root>'
    const expectedBase64 =
      'PHJvb3Q+PGVsZW1lbnQ+dmFsdWU8L2VsZW1lbnQ+PC9yb290Pg==' // Buffer.from(xmlString).toString('base64')
    expect(encodeToBase64(xmlString)).toBe(expectedBase64)
  })

  it('should correctly encode an empty string', () => {
    const emptyString = ''
    const expectedBase64 = '' // Buffer.from(emptyString).toString('base64')
    expect(encodeToBase64(emptyString)).toBe(expectedBase64)
  })

  it('should correctly encode a string with special characters', () => {
    const specialString = '!@#$%^&*()_+=-`~[]{}\\|;\'",./<>?'
    const expectedBase64 = 'IUAjJCVeJiooKV8rPS1gfltde31cfDsnIiwuLzw+Pw==' // Corrected value
    expect(encodeToBase64(specialString)).toBe(expectedBase64)
  })

  it('should correctly encode a string with Unicode characters', () => {
    const unicodeString = '你好世界🌍'
    const expectedBase64 = '5L2g5aW95LiW55WM8J+MjQ==' // Corrected value
    expect(encodeToBase64(unicodeString)).toBe(expectedBase64)
  })

  it('should correctly encode a longer string', () => {
    const longString =
      'This is a longer string that needs to be encoded to Base64 to ensure it handles more than just a few characters correctly.'
    const expectedBase64 =
      'VGhpcyBpcyBhIGxvbmdlciBzdHJpbmcgdGhhdCBuZWVkcyB0byBiZSBlbmNvZGVkIHRvIEJhc2U2NCB0byBlbnN1cmUgaXQgaGFuZGxlcyBtb3JlIHRoYW4ganVzdCBhIGZldyBjaGFyYWN0ZXJzIGNvcnJlY3RseS4=' // Buffer.from(longString).toString('base64')
    expect(encodeToBase64(longString)).toBe(expectedBase64)
  })
})
