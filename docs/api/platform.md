# Document Types & Notifications

Platform APIs with no documented rate limit — the client queues them in a
conservative 60/min bucket.

## `getDocumentTypes`

```typescript
getDocumentTypes(): Promise<DocumentTypesResponse>
```

Lists every document type on the platform (invoice, credit note, debit note,
refund note and self-billed variants) with their active versions.

**Official docs:** [Get All Document Types](https://sdk.myinvois.hasil.gov.my/api/03-get-document-types/)
(`GET /api/v1.0/documenttypes`)

## `getDocumentType`

```typescript
getDocumentType(id: number): Promise<DocumentTypeResponse>
```

One document type by its numeric ID, including version metadata.

**Official docs:** [Get Document Type](https://sdk.myinvois.hasil.gov.my/api/04-get-document-type/)
(`GET /api/v1.0/documenttypes/{id}`)

## `getDocumentTypeVersion`

```typescript
getDocumentTypeVersion(id: number, versionId: number): Promise<DocumentTypeVersionResponse>
```

A specific version of a document type, including its JSON/XML schema
definitions.

**Official docs:** [Get Document Type Version](https://sdk.myinvois.hasil.gov.my/api/05-get-document-type-version/)
(`GET /api/v1.0/documenttypes/{id}/versions/{versionId}`)

## `getNotifications`

```typescript
getNotifications(params: {
  dateFrom?: string   // UTC ISO 8601
  dateTo?: string
  type?: number
  language?: 'ms' | 'en'
  status?: number     // delivery status 1-5
  pageNo?: number
  pageSize?: number   // max 100
}): Promise<NotificationResponse> // { result, metadata }
```

Platform notifications (document processing, system updates, account
messages). The API wraps notifications in a `result` array with
`metadata.hasNext` paging.

**Official docs:** [Get Notifications](https://sdk.myinvois.hasil.gov.my/api/06-get-notifications/)
(`GET /api/v1.0/notifications/taxpayer`)

```typescript
const { result, metadata } = await client.getNotifications({
  dateFrom: '2026-01-01T00:00:00Z',
  pageSize: 20,
})
```
