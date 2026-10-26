# Runtime Code Lists

The official MyInvois code tables ship as typed runtime arrays under a
separate subpath, so they stay out of your main bundle unless imported:

```typescript
import {
  TAX_TYPES,            // { code: '01', description: 'Sales Tax' }, ...
  CLASSIFICATION_CODES,
  STATE_CODES,
  COUNTRY_CODES,
  CURRENCY_CODES,
  E_INVOICE_TYPES,
  PAYMENT_MODES,
  UNIT_TYPES,           // 2000+ UOM codes
  MSIC_CODES,           // 1000+ industry codes, with categoryReference
} from '@ripwords/myinvois-client/codes'
```

Every entry's `code` is checked against the same TypeScript union types the
document builder uses, so the lists and the compile-time types cannot drift
apart.

## Lists and their official sources

| Export | Entries | Official documentation |
|---|---|---|
| `TAX_TYPES` | 7 | [Tax types](https://sdk.myinvois.hasil.gov.my/codes/tax-types/) |
| `CLASSIFICATION_CODES` | 45 | [Classification codes](https://sdk.myinvois.hasil.gov.my/codes/classification-codes/) |
| `STATE_CODES` | 17 | [State codes](https://sdk.myinvois.hasil.gov.my/codes/state-codes/) |
| `COUNTRY_CODES` | 253 | [Country codes](https://sdk.myinvois.hasil.gov.my/codes/countries/) |
| `CURRENCY_CODES` | 180 | [Currency codes](https://sdk.myinvois.hasil.gov.my/codes/currencies/) |
| `E_INVOICE_TYPES` | 8 | [e-Invoice types](https://sdk.myinvois.hasil.gov.my/codes/e-invoice-types/) |
| `PAYMENT_MODES` | 8 | [Payment methods](https://sdk.myinvois.hasil.gov.my/codes/payment-methods/) |
| `UNIT_TYPES` | 2162 | [Unit types](https://sdk.myinvois.hasil.gov.my/codes/unit-types/) |
| `MSIC_CODES` | 1174 | [MSIC codes](https://sdk.myinvois.hasil.gov.my/codes/msic-codes/) |

The tables are regenerated from the official SDK JSON files
(`https://sdk.myinvois.hasil.gov.my/files/*.json`) with
`bun run scripts/generate-codes.ts` — rerun it when LHDN updates a table.

## Example: populate a dropdown

```typescript
import { STATE_CODES } from '@ripwords/myinvois-client/codes'

const options = STATE_CODES.map(s => ({ value: s.code, label: s.name }))
// [{ value: '01', label: 'Johor' }, ..., { value: '14', label: 'Wilayah Persekutuan Kuala Lumpur' }, ...]
```
