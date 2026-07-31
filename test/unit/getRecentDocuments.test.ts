import { describe, expect, it, vi } from 'vitest'
import { getRecentDocuments } from '../../src/api/documentManagement'

const makeContext = (payload: unknown) => ({
  fetch: vi.fn(async () => ({
    json: async () => payload,
  })) as unknown as typeof fetch,
})

describe('getRecentDocuments', () => {
  it('calls the recent documents endpoint', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {})

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('/api/v1.0/documents/recent')
  })

  it('passes paging and filter parameters as query string', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {
      pageNo: 2,
      pageSize: 50,
      invoiceDirection: 'Sent',
      status: 'Valid',
    })

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('pageNo=2')
    expect(calledWith).toContain('pageSize=50')
    expect(calledWith).toContain('InvoiceDirection=Sent')
    expect(calledWith).toContain('status=Valid')
  })

  it('emits InvoiceDirection with capital I and D, not lowercase invoiceDirection', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {
      invoiceDirection: 'Sent',
    })

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('InvoiceDirection=Sent')
    expect(calledWith).not.toContain('invoiceDirection=')
  })

  it('includes issuer and receiver identifier parameters in query string', async () => {
    const context = makeContext({ result: [] })
    await getRecentDocuments(context, {
      issuerIdType: 'BRN',
      issuerId: '123456789',
      receiverTin: '987654321',
    })

    const calledWith = (context.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0]
    expect(calledWith).toContain('issuerIdType=BRN')
    expect(calledWith).toContain('issuerId=123456789')
    expect(calledWith).toContain('receiverTin=987654321')
  })

  it('normalises longID to longId', async () => {
    const context = makeContext({
      result: [{ uuid: 'abc', longID: 'LONG-1' }],
    })
    const documents = await getRecentDocuments(context, {})
    expect(documents[0].longId).toBe('LONG-1')
  })

  it('accepts a bare array response', async () => {
    const context = makeContext([{ uuid: 'abc', longId: 'LONG-2' }])
    const documents = await getRecentDocuments(context, {})
    expect(documents).toHaveLength(1)
  })
})
