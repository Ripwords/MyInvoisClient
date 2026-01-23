import { MyInvoisClient, RegistrationType } from '../src'

// Parse CLI arguments
const args = process.argv.slice(2)

// Simple argument parser: --idType BRN --idValue 197301002252 [--idName "Name"] [--fileType 2]
// Or positional: idType idValue [idName] [fileType]
let idType: RegistrationType | undefined
let idValue: string | undefined
let idName: string | undefined
let fileType: '1' | '2' | undefined

if (args.length >= 2 && !args[0].startsWith('--')) {
  // Positional arguments: idType idValue [idName] [fileType]
  idType = args[0] as RegistrationType
  idValue = args[1]
  if (args.length >= 3) idName = args[2]
  if (args.length >= 4) fileType = args[3] as '1' | '2'
} else {
  // Named arguments: --idType BRN --idValue 197301002252 [--idName "Name"] [--fileType 2]
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]

    if (key === '--idType') idType = value as RegistrationType
    else if (key === '--idValue') idValue = value
    else if (key === '--idName') idName = value
    else if (key === '--fileType') fileType = value as '1' | '2'
  }
}

if (!idType || !idValue) {
  console.error(
    'Usage: tsx tin-search-test.ts --idType <type> --idValue <value> [--idName <name>] [--fileType <1|2>]',
  )
  console.error(
    '   Or: tsx tin-search-test.ts <idType> <idValue> [<idName>] [<fileType>]',
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
  const result = await client.searchTin({
    idType,
    idValue,
    taxpayerName: idName,
    fileType,
  })
  console.log(result)
} catch (error) {
  console.error(error)
  process.exit(1)
}
