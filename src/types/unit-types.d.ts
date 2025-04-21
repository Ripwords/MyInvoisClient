import { UnitTypeCode_1X } from './unit/1X'
import { UnitTypeCode_2X } from './unit/2X'
import { UnitTypeCode_3X } from './unit/3X'
import { UnitTypeCode_4X } from './unit/4X'
import { UnitTypeCode_5X } from './unit/5X'
import { UnitTypeCode_6X } from './unit/6X'
import { UnitTypeCode_7X } from './unit/7X'
import { UnitTypeCode_8X } from './unit/8X'
import { UnitTypeCode_9X } from './unit/9X'
import { UnitTypeCode_AX } from './unit/AX'
import { UnitTypeCode_BX } from './unit/BX'
import { UnitTypeCode_CX } from './unit/CX'
import { UnitTypeCode_DX } from './unit/DX'
import { UnitTypeCode_EX } from './unit/EX'
import { UnitTypeCode_FX } from './unit/FX'
import { UnitTypeCode_GX } from './unit/GX'
import { UnitTypeCode_HX } from './unit/HX'
import { UnitTypeCode_IX } from './unit/IX'
import { UnitTypeCode_JX } from './unit/JX'
import { UnitTypeCode_KX } from './unit/KX'
import { UnitTypeCode_LX } from './unit/LX'
import { UnitTypeCode_MX } from './unit/MX'
import { UnitTypeCode_NX } from './unit/NX'
import { UnitTypeCode_OX } from './unit/OX'
import { UnitTypeCode_PX } from './unit/PX'
import { UnitTypeCode_QX } from './unit/QX'
import { UnitTypeCode_RX } from './unit/RX'
import { UnitTypeCode_SX } from './unit/SX'
import { UnitTypeCode_TX } from './unit/TX'
import { UnitTypeCode_UX } from './unit/UX'
import { UnitTypeCode_VX } from './unit/VX'
import { UnitTypeCode_WX } from './unit/WX'
import { UnitTypeCode_YX } from './unit/YX'
import { UnitTypeCode_ZX } from './unit/ZX'
import { UnitTypeCode_XX } from './unit/XX'

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
