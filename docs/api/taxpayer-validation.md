# Taxpayer Validation

## `verifyTin`

```typescript
verifyTin(tin: string, idType: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY', idValue: string):
  Promise<boolean>
```

Validates that a TIN matches the given identification.

**Official docs:** [Validate Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/01-validate-taxpayer-tin/)
(`GET /api/v1.0/taxpayer/validate/{tin}?idType=&idValue=`)

- `true` — registered (HTTP 200)
- `false` — **only** for HTTP 404 ("this TIN/ID combination is not registered")
- throws [`MyInvoisApiError`](/guide/errors) for 400/401/429/5xx and network
  errors, so an outage is never misreported as an invalid TIN

```typescript
const isValid = await client.verifyTin('C26135266000', 'BRN', '201901030382')
```

## `searchTin`

```typescript
searchTin(params: {
  taxpayerName?: string
  idType?: 'NRIC' | 'PASSPORT' | 'BRN' | 'ARMY'
  idValue?: string
  fileType?: string
}): Promise<{ tin: string }>
```

Finds a TIN by taxpayer name and/or ID. Valid parameter combinations
(enforced client-side before any request): `taxpayerName` alone,
`idType + idValue`, or both together.

**Official docs:** [Search Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/10-search-taxpayer-tin/)
(`GET /api/v1.0/taxpayer/search/tin`) — rate limited to 60/min.

Failures throw [`MyInvoisApiError`](/guide/errors) with `status` and `body`:

| `err.status` | Meaning |
|---|---|
| 404 | No taxpayer matches (the body is empty) |
| 400 | Bad input, or inconclusive criteria (multiple TINs match a BRN) |
| 401 | Token problem |
| 429 / 5xx | Transient — retry later |

```typescript
try {
  const { tin } = await client.searchTin({ idType: 'NRIC', idValue: '901231012345' })
} catch (err) {
  if (err instanceof MyInvoisApiError && err.status === 404) {
    // not registered
  }
}
```

## `getTaxpayerQRCode`

```typescript
getTaxpayerQRCode(qrCodeText: string): Promise<TaxpayerQRCodeResponse>
```

Resolves taxpayer info from a scanned MyInvois taxpayer QR code. Accepts
either the raw Base64 QR content or the already-decoded token — the client
normalises it before calling the API.

**Official docs:** [Taxpayer's QR Code](https://sdk.myinvois.hasil.gov.my/einvoicingapi/11-qr-code/)
(`GET /api/v1.0/taxpayers/qrcodeinfo/{token}`) — rate limited to 60/min.
