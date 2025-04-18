import type { MSIC_0X_CODE } from './msic/0X.d.ts'
import type { MSIC_1X_CODE } from './msic/1X.d.ts'
import type { MSIC_2X_CODE } from './msic/2X.d.ts'
import type { MSIC_3X_CODE } from './msic/3X.d.ts'
import type { MSIC_4X_CODE } from './msic/4X.d.ts'
import type { MSIC_5X_CODE } from './msic/5X.d.ts'
import type { MSIC_6X_CODE } from './msic/6X.d.ts'
import type { MSIC_7X_CODE } from './msic/7X.d.ts'
import type { MSIC_8X_CODE } from './msic/8X.d.ts'
import type { MSIC_9X_CODE } from './msic/9X.d.ts'

export type MSICCode = {
  code: string
  description: string
  msicCategoryReference: string
}

/**
 * Represents the allowed 5-digit Malaysia Standard Industrial Classification (MSIC) codes.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/msic-codes/
 * Interface representing an MSIC code entry.
 * Contains the 5-digit code and its description.
 */
export interface MsicEntry {
  code:
    | MSIC_0X_CODE
    | MSIC_1X_CODE
    | MSIC_2X_CODE
    | MSIC_3X_CODE
    | MSIC_4X_CODE
    | MSIC_5X_CODE
    | MSIC_6X_CODE
    | MSIC_7X_CODE
    | MSIC_8X_CODE
    | MSIC_9X_CODE
  description: string
}
