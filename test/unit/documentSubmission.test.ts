import { describe, it, expect, vi } from 'vitest'
import { performDocumentAction } from '../../src/api/documentSubmission'
import { MyInvoisApiError } from '../../src/errors'

describe('performDocumentAction', () => {
  it('makes PUT request with correct body for cancel', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          uuid: 'doc-123',
          status: 'Cancelled',
        }),
    })

    const result = await performDocumentAction(
      { fetch: mockFetch },
      'doc-123',
      'cancelled',
      'Duplicate submission',
    )

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/documents/state/doc-123/state',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          reason: 'Duplicate submission',
        }),
      },
    )
    expect(result.uuid).toBe('doc-123')
    expect(result.status).toBe('Cancelled')
  })

  it('makes PUT request with correct body for reject', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          uuid: 'doc-456',
          status: 'Rejected',
        }),
    })

    const result = await performDocumentAction(
      { fetch: mockFetch },
      'doc-456',
      'rejected',
      'Invalid tax calculation',
    )

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/documents/state/doc-456/state',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reason: 'Invalid tax calculation',
        }),
      },
    )
    expect(result.uuid).toBe('doc-456')
    expect(result.status).toBe('Rejected')
  })

  it('throws error when reason exceeds 300 characters', async () => {
    const mockFetch = vi.fn()
    const longReason = 'a'.repeat(301)

    await expect(
      performDocumentAction(
        { fetch: mockFetch },
        'doc-123',
        'cancelled',
        longReason,
      ),
    ).rejects.toThrow('Reason must not exceed 300 characters')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('allows reason with exactly 300 characters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          uuid: 'doc-123',
          status: 'Cancelled',
        }),
    })
    const exactReason = 'a'.repeat(300)

    const result = await performDocumentAction(
      { fetch: mockFetch },
      'doc-123',
      'cancelled',
      exactReason,
    )

    expect(mockFetch).toHaveBeenCalled()
    expect(result.uuid).toBe('doc-123')
  })

  it('throws a typed error carrying the LHDN error for a refused action', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: {
              code: 'OperationPeriodOver',
              message: 'Document cannot be cancelled after 72 hours',
              target: 'document',
              details: [],
            },
          }),
        ),
    })

    const failure = performDocumentAction(
      { fetch: mockFetch },
      'doc-123',
      'cancelled',
      'Too late cancellation',
    )

    await expect(failure).rejects.toThrow(MyInvoisApiError)
    await failure.catch((err: MyInvoisApiError) => {
      expect(err.status).toBe(400)
      expect(err.apiError?.code).toBe('OperationPeriodOver')
      expect(err.apiError?.message).toBe(
        'Document cannot be cancelled after 72 hours',
      )
    })
  })
})
