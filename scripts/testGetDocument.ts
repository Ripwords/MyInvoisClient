import { MyInvoisClient } from '../src'

// Parse CLI arguments
const args = process.argv.slice(2)

let documentUid: string | undefined

if (args.length >= 1 && !args[0].startsWith('--')) {
  // Positional: documentUid
  documentUid = args[0]
} else {
  // Named: --documentUid <uid>
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]

    if (key === '--documentUid') documentUid = value
  }
}

if (!documentUid) {
  console.error('Usage: tsx testGetDocument.ts --documentUid <uid>')
  console.error('   Or: tsx testGetDocument.ts <documentUid>')
  process.exit(1)
}

const client = new MyInvoisClient(
  process.env.TEST_CLIENT_ID!,
  process.env.TEST_CLIENT_SECRET!,
  'sandbox',
  process.env.TEST_CERTIFICATE!,
  process.env.TEST_PRIVATE_KEY!,
)

try {
  console.log('--- getDocument ---')
  const document = await client.getDocument(documentUid)
  console.log(document)

  console.log('\n--- getDocumentDetails ---')
  const details = await client.getDocumentDetails(documentUid)
  console.log(details)
} catch (error) {
  console.error(error)
  process.exit(1)
}
