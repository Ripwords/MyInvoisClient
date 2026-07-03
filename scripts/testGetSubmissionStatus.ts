import { MyInvoisClient } from '../src'

// Parse CLI arguments
const args = process.argv.slice(2)

let submissionUid: string | undefined
let pollInterval: number | undefined
let maxRetries: number | undefined
let pageNo: number | undefined
let pageSize: number | undefined

if (args.length >= 1 && !args[0].startsWith('--')) {
  // Positional: submissionUid [pollInterval] [maxRetries] [pageNo] [pageSize]
  submissionUid = args[0]
  if (args[1]) pollInterval = Number(args[1])
  if (args[2]) maxRetries = Number(args[2])
  if (args[3]) pageNo = Number(args[3])
  if (args[4]) pageSize = Number(args[4])
} else {
  // Named: --submissionUid <uid> [--pollInterval <ms>] [--maxRetries <n>] [--pageNo <n>] [--pageSize <n>]
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]

    if (key === '--submissionUid') submissionUid = value
    else if (key === '--pollInterval') pollInterval = Number(value)
    else if (key === '--maxRetries') maxRetries = Number(value)
    else if (key === '--pageNo') pageNo = Number(value)
    else if (key === '--pageSize') pageSize = Number(value)
  }
}

if (!submissionUid) {
  console.error(
    'Usage: tsx testGetSubmissionStatus.ts --submissionUid <uid> [--pollInterval <ms>] [--maxRetries <n>] [--pageNo <n>] [--pageSize <n>]',
  )
  console.error(
    '   Or: tsx testGetSubmissionStatus.ts <submissionUid> [pollInterval] [maxRetries] [pageNo] [pageSize]',
  )
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
  console.log('--- getSubmissionStatus ---')
  const result = await client.getSubmissionStatus(
    submissionUid,
    pollInterval,
    maxRetries,
    pageNo,
    pageSize,
  )
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error)
  process.exit(1)
}
