// Import necessary components from xmldom-ts and xpath-ts
import { DOMParserImpl, XMLSerializerImpl } from 'xmldom-ts'
import * as xpath from 'xpath-ts'
// Assuming Node and Document types are correctly exposed by xmldom-ts/xpath-ts globally or via import

/**
 * Transforms an XML invoice string according to specific rules using xmldom-ts and xpath-ts:
 * - Removes the XML declaration.
 * - Removes UBLExtensions and Signature elements within the Invoice element.
 * Assumes the input XML is UTF-8 encoded.
 *
 * @param xmlString The raw XML invoice string.
 * @returns The transformed XML string.
 * @throws {Error} If parsing fails.
 */
export function transformXmlInvoice(xmlString: string): string {
  let doc: Document // Use the standard Document type, assuming compatibility
  const errors: string[] = []

  // Define separate handlers for each error level as likely expected by xmldom-ts
  const handleError = (msg: string) => {
    errors.push(`ERROR: ${msg}`)
  }
  const handleFatalError = (msg: string) => {
    errors.push(`FATALERROR: ${msg}`)
  }
  const handleWarning = (msg: string) => {
    console.warn(`WARNING: ${msg}`)
  }

  // Use DOMParserImpl from xmldom-ts with the specific error handler structure
  const parser = new DOMParserImpl({
    locator: {}, // Keep locator, might be useful for error context
    errorHandler: {
      error: handleError,
      fatalError: handleFatalError,
      warning: handleWarning,
    },
  })

  try {
    // Use the standard mime type string directly
    doc = parser.parseFromString(xmlString, 'application/xml') // Or 'text/xml'
  } catch (e: any) {
    throw new Error(`XML Parsing Initialization Error: ${e.message || e}`)
  }

  // Check for parsererror element
  const parserErrors = doc.getElementsByTagName('parsererror')
  if (parserErrors.length > 0) {
    const errorElement = parserErrors[0]
    if (errorElement) {
      const errorContent = errorElement.textContent
        ? errorElement.textContent.trim()
        : 'Unknown parsing error reported by parsererror tag.'
      throw new Error(`XML Parsing Error: ${errorContent}`)
    } else {
      throw new Error('XML Parsing Error: Malformed parsererror tag found.')
    }
  }

  // If the errorHandler collected errors, throw the first one.
  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  // Use xpath.select from xpath-ts
  const select = xpath.select

  // Helper function to remove nodes found by XPath
  const removeNodesByXPath = (path: string) => {
    const nodesToRemove = select(path, doc) as Node[]

    if (nodesToRemove && nodesToRemove instanceof Array) {
      nodesToRemove.forEach(node => {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node)
        }
      })
    }
  }

  // 2. Find and remove UBLExtensions elements
  removeNodesByXPath(
    "//*[local-name()='Invoice']//*[local-name()='UBLExtensions']",
  )

  // 3. Find and remove Signature elements
  removeNodesByXPath("//*[local-name()='Invoice']//*[local-name()='Signature']")

  // 4. Serialize the modified DOM back to string using XMLSerializerImpl
  const serializer = new XMLSerializerImpl()
  let transformedXml = serializer.serializeToString(doc)

  // 5. Remove the XML declaration (if present)
  transformedXml = transformedXml.replace(/^<\?xml [^>]*\?>\s*/i, '')

  return transformedXml
}
