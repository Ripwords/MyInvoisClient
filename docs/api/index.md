# API Reference

Every public method of `MyInvoisClient`, grouped by the official API areas.
Each method links back to the LHDN endpoint documentation it wraps —
cross-check there for authoritative request/response semantics.

## Coverage map

| Client method | Official endpoint | Official docs |
|---|---|---|
| *(automatic login)* | `POST /connect/token` | [Login as Taxpayer](https://sdk.myinvois.hasil.gov.my/api/07-login-as-taxpayer-system/) · [Login as Intermediary](https://sdk.myinvois.hasil.gov.my/api/08-login-as-intermediary-system/) |
| [`submitDocument`](/api/document-submission#submitdocument) | `POST /api/v1.0/documentsubmissions` | [Submit Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/02-submit-documents/) |
| [`getSubmissionStatus`](/api/document-submission#getsubmissionstatus) | `GET /api/v1.0/documentsubmissions/{uid}` | [Get Submission](https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/) |
| [`cancelDocument`](/api/document-management#canceldocument) | `PUT /api/v1.0/documents/state/{uuid}/state` | [Cancel Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/03-cancel-document/) |
| [`rejectDocument`](/api/document-management#rejectdocument) | `PUT /api/v1.0/documents/state/{uuid}/state` | [Reject Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/04-reject-document/) |
| [`getDocument`](/api/document-management#getdocument) | `GET /api/v1.0/documents/{uuid}/raw` | [Get Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/07-get-document/) |
| [`getDocumentDetails`](/api/document-management#getdocumentdetails) | `GET /api/v1.0/documents/{uuid}/details` | [Get Document Details](https://sdk.myinvois.hasil.gov.my/einvoicingapi/08-get-document-details/) |
| [`getRecentDocuments`](/api/document-management#getrecentdocuments) | `GET /api/v1.0/documents/recent` | [Get Recent Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/05-get-recent-documents/) |
| [`searchDocuments`](/api/document-management#searchdocuments) | `GET /api/v1.0/documents/search` | [Search Documents](https://sdk.myinvois.hasil.gov.my/einvoicingapi/09-search-documents/) |
| [`getDocumentQrCode`](/api/document-management#getdocumentqrcode) | *(share URL from uuid + longId)* | [Get Document](https://sdk.myinvois.hasil.gov.my/einvoicingapi/07-get-document/) |
| [`verifyTin`](/api/taxpayer-validation#verifytin) | `GET /api/v1.0/taxpayer/validate/{tin}` | [Validate Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/01-validate-taxpayer-tin/) |
| [`searchTin`](/api/taxpayer-validation#searchtin) | `GET /api/v1.0/taxpayer/search/tin` | [Search Taxpayer's TIN](https://sdk.myinvois.hasil.gov.my/einvoicingapi/10-search-taxpayer-tin/) |
| [`getTaxpayerQRCode`](/api/taxpayer-validation#gettaxpayerqrcode) | `GET /api/v1.0/taxpayers/qrcodeinfo/{token}` | [Taxpayer's QR Code](https://sdk.myinvois.hasil.gov.my/einvoicingapi/11-qr-code/) |
| [`getDocumentTypes`](/api/platform#getdocumenttypes) | `GET /api/v1.0/documenttypes` | [Get All Document Types](https://sdk.myinvois.hasil.gov.my/api/03-get-document-types/) |
| [`getDocumentType`](/api/platform#getdocumenttype) | `GET /api/v1.0/documenttypes/{id}` | [Get Document Type](https://sdk.myinvois.hasil.gov.my/api/04-get-document-type/) |
| [`getDocumentTypeVersion`](/api/platform#getdocumenttypeversion) | `GET /api/v1.0/documenttypes/{id}/versions/{vid}` | [Get Document Type Version](https://sdk.myinvois.hasil.gov.my/api/05-get-document-type-version/) |
| [`getNotifications`](/api/platform#getnotifications) | `GET /api/v1.0/notifications/taxpayer` | [Get Notifications](https://sdk.myinvois.hasil.gov.my/api/06-get-notifications/) |

Document building and signing helpers (`buildSignedDocuments`,
`buildSignedDocument`, `generateCompleteDocument`, …) are local operations —
no endpoint — documented in [Signing & Submission](/guide/signing).

Document structures follow the official types, e.g.
[Invoice v1.1](https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-1/);
all code fields are typed against the official
[code tables](https://sdk.myinvois.hasil.gov.my/codes/).
