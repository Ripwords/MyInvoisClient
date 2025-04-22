import { describe, it, expect } from 'vitest'
import { transformXmlInvoice } from '../src/utils/signature/transform'

// Helper function to normalize whitespace for comparisons
const normalize = (str: string) => str.replace(/\s+/g, ' ').trim()

describe('transformXmlInvoice', () => {
  it('should remove XML declaration, UBLExtensions, and Signature', () => {
    // Note: Backticks used for multi-line strings
    const inputXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <!-- Signature Block -->
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cac:Signature>
        <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>SignerID</cbc:ID>
            </cac:PartyIdentification>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>#SignatureID</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    <cbc:ID>INV123</cbc:ID>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>Supplier Inc.</cbc:Name>
            </cac:PartyName>
        </cac:Party>
    </cac:AccountingSupplierParty>
</Invoice>`

    const expectedXml = `
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">

    <cbc:ID>INV123</cbc:ID>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>Supplier Inc.</cbc:Name>
            </cac:PartyName>
        </cac:Party>
    </cac:AccountingSupplierParty>
</Invoice>`

    expect(normalize(transformXmlInvoice(inputXml))).toEqual(
      normalize(expectedXml),
    )
  })

  it('should only remove XML declaration if others are absent', () => {
    const inputXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice><ID>1</ID></Invoice>`
    const expectedXml = `<Invoice><ID>1</ID></Invoice>`
    expect(transformXmlInvoice(inputXml)).toEqual(expectedXml)
  })

  it('should only remove UBLExtensions if others are absent', () => {
    const inputXml = `<Invoice xmlns:ext="urn:ext"><ext:UBLExtensions><data/></ext:UBLExtensions><ID>1</ID></Invoice>`
    const expectedXml = `<Invoice xmlns:ext="urn:ext"><ID>1</ID></Invoice>`
    expect(transformXmlInvoice(inputXml)).toEqual(expectedXml)
  })

  it('should only remove Signature if others are absent', () => {
    const inputXml = `<Invoice xmlns:cac="urn:cac"><cac:Signature><data/></cac:Signature><ID>1</ID></Invoice>`
    const expectedXml = `<Invoice xmlns:cac="urn:cac"><ID>1</ID></Invoice>`
    expect(transformXmlInvoice(inputXml)).toEqual(expectedXml)
  })

  it('should return unchanged XML if no transformations are needed', () => {
    const inputXml = `<Invoice><ID>1</ID><Amount>100</Amount></Invoice>`
    expect(transformXmlInvoice(inputXml)).toEqual(inputXml)
  })

  it('should handle XML without specified elements gracefully', () => {
    const inputXml = `<Invoice><ID>1</ID></Invoice>`
    const expectedXml = `<Invoice><ID>1</ID></Invoice>`
    expect(transformXmlInvoice(inputXml)).toEqual(expectedXml)
  })

  it('should throw an error for invalid XML', () => {
    // Correctly define invalidXml for this test scope
    const invalidXml = `<Invoice><ID>1</ID` // Missing closing tag
    // Adjust the regex to match the actual error format from the handler
    expect(() => transformXmlInvoice(invalidXml)).toThrow(
      /^ERROR: \[xmldom error\]/,
    )
  })

  it('should remove elements regardless of namespace prefixes', () => {
    const inputXml = `<?xml version="1.0"?>
<inv:Invoice xmlns:inv="urn:invoice" xmlns:common="urn:common" xmlns:sig="urn:signature">
    <common:UBLExtensions><data/></common:UBLExtensions>
    <sig:Signature><data/></sig:Signature>
    <inv:ID>INV999</inv:ID>
</inv:Invoice>`
    const expectedXml = `<inv:Invoice xmlns:inv="urn:invoice" xmlns:common="urn:common" xmlns:sig="urn:signature">

    <inv:ID>INV999</inv:ID>
</inv:Invoice>`

    expect(normalize(transformXmlInvoice(inputXml))).toEqual(
      normalize(expectedXml),
    )
  })

  it('should handle self-closing UBLExtensions and Signature tags', () => {
    const inputXml = `<?xml version="1.0"?>
<Invoice xmlns:ext="urn:ext" xmlns:cac="urn:cac">
    <ext:UBLExtensions />
    <cac:Signature />
    <ID>1</ID>
</Invoice>`
    const expectedXml = `<Invoice xmlns:ext="urn:ext" xmlns:cac="urn:cac">

    <ID>1</ID>
</Invoice>`
    expect(normalize(transformXmlInvoice(inputXml))).toEqual(
      normalize(expectedXml),
    )
  })

  it('should handle nested UBLExtensions/Signature (though unlikely structure)', () => {
    const inputXml = `<?xml version="1.0"?>
<Invoice xmlns:ext="urn:ext" xmlns:cac="urn:cac">
    <SomeElement>
        <ext:UBLExtensions><Data1/></ext:UBLExtensions>
    </SomeElement>
    <cac:Signature><Data2/></cac:Signature>
    <ID>1</ID>
</Invoice>`
    const expectedXml = `<Invoice xmlns:ext="urn:ext" xmlns:cac="urn:cac">
    <SomeElement>

    </SomeElement>

    <ID>1</ID>
</Invoice>`
    expect(normalize(transformXmlInvoice(inputXml))).toEqual(
      normalize(expectedXml),
    )
  })
})
