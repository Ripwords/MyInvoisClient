import type { UnitTypeCode_1X } from './unit/1X.d.ts'
import type { UnitTypeCode_2X } from './unit/2X.d.ts'
import type { UnitTypeCode_3X } from './unit/3X.d.ts'
import type { UnitTypeCode_4X } from './unit/4X.d.ts'
import type { UnitTypeCode_5X } from './unit/5X.d.ts'
import type { UnitTypeCode_6X } from './unit/6X.d.ts'
import type { UnitTypeCode_7X } from './unit/7X.d.ts'
import type { UnitTypeCode_8X } from './unit/8X.d.ts'
import type { UnitTypeCode_9X } from './unit/9X.d.ts'
import type { UnitTypeCode_AX } from './unit/AX.d.ts'
import type { UnitTypeCode_BX } from './unit/BX.d.ts'
import type { UnitTypeCode_CX } from './unit/CX.d.ts'
import type { UnitTypeCode_DX } from './unit/DX.d.ts'
import type { UnitTypeCode_EX } from './unit/EX.d.ts'
import type { UnitTypeCode_FX } from './unit/FX.d.ts'
import type { UnitTypeCode_GX } from './unit/GX.d.ts'
import type { UnitTypeCode_HX } from './unit/HX.d.ts'
import type { UnitTypeCode_IX } from './unit/IX.d.ts'
import type { UnitTypeCode_JX } from './unit/JX.d.ts'
import type { UnitTypeCode_KX } from './unit/KX.d.ts'
import type { UnitTypeCode_LX } from './unit/LX.d.ts'
import type { UnitTypeCode_MX } from './unit/MX.d.ts'
import type { UnitTypeCode_NX } from './unit/NX.d.ts'
import type { UnitTypeCode_OX } from './unit/OX.d.ts'
import type { UnitTypeCode_PX } from './unit/PX.d.ts'
import type { UnitTypeCode_QX } from './unit/QX.d.ts'
import type { UnitTypeCode_RX } from './unit/RX.d.ts'
import type { UnitTypeCode_SX } from './unit/SX.d.ts'
import type { UnitTypeCode_TX } from './unit/TX.d.ts'
import type { UnitTypeCode_UX } from './unit/UX.d.ts'
import type { UnitTypeCode_VX } from './unit/VX.d.ts'
import type { UnitTypeCode_WX } from './unit/WX.d.ts'
import type { UnitTypeCode_YX } from './unit/YX.d.ts'
import type { UnitTypeCode_ZX } from './unit/ZX.d.ts'
import type { UnitTypeCode_XX } from './unit/XX.d.ts'

/**
 * Represents the allowed codes for Unit of Measurement types.
 * Based on UN/ECE Recommendation 20, Revision 17 (2021) as per the documentation:
 * https://sdk.myinvois.hasil.gov.my/codes/unit-types/
 */
export type UnitTypeCode =
  | UnitTypeCode_1X
  | UnitTypeCode_2X
  | UnitTypeCode_3X
  | UnitTypeCode_4X
  | UnitTypeCode_5X
  | UnitTypeCode_6X
  | UnitTypeCode_7X
  | UnitTypeCode_8X
  | UnitTypeCode_9X
  | UnitTypeCode_AX
  | UnitTypeCode_BX
  | UnitTypeCode_CX
  | UnitTypeCode_DX
  | UnitTypeCode_EX
  | UnitTypeCode_FX
  | UnitTypeCode_GX
  | UnitTypeCode_HX
  | UnitTypeCode_IX
  | UnitTypeCode_JX
  | UnitTypeCode_KX
  | UnitTypeCode_LX
  | UnitTypeCode_MX
  | UnitTypeCode_NX
  | UnitTypeCode_OX
  | UnitTypeCode_PX
  | UnitTypeCode_QX
  | UnitTypeCode_RX
  | UnitTypeCode_SX
  | UnitTypeCode_TX
  | UnitTypeCode_UX
  | UnitTypeCode_VX
  | UnitTypeCode_WX
  | UnitTypeCode_YX
  | UnitTypeCode_ZX
  | UnitTypeCode_XX

/**
 * Interface representing a Unit of Measurement entry.
 * Contains the code and its corresponding name.
 */
export interface UnitType {
  code: UnitTypeCode
  name: string
}
