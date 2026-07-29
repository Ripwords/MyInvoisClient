import { describe, expect, it, vi } from 'vitest'
import { getRecentDocuments } from '../src/api/documentManagement'

const makeContext = (payload: unknown) => ({
  fetch: vi.fn(async () => ({
    json: async () => payload,
  })) as unknown as typeof fetch,
  debug: false,
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
    expect(calledWith).toContain('invoiceDirection=Sent')
    expect(calledWith).toContain('status=Valid')
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
