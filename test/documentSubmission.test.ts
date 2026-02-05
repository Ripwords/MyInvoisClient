import { describe, it, expect, vi } from 'vitest'
import { performDocumentAction } from '../src/api/documentSubmission'

describe('performDocumentAction', () => {
  it('makes PUT request with correct body for cancel', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
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

  it('parses error response correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          uuid: 'doc-123',
          status: 'Valid',
          error: {
            code: 'InvalidOperation',
            message: 'Document cannot be cancelled after 72 hours',
            target: 'document',
            details: [],
          },
        }),
    })

    const result = await performDocumentAction(
      { fetch: mockFetch },
      'doc-123',
      'cancelled',
      'Too late cancellation',
    )

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('InvalidOperation')
    expect(result.error.message).toBe(
      'Document cannot be cancelled after 72 hours',
    )
  })
})
