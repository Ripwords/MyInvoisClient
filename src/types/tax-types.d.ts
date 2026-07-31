/**
 * Represents the allowed codes for tax types.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/tax-types/
 */
export type TaxTypeCode =
  | '01' // Sales Tax
  | '02' // Service Tax
  | '03' // Tourism Tax
  | '04' // High-Value Goods Tax
  | '05' // Sales Tax on Low Value Goods
  | '06' // Not Applicable
  | 'E' // Tax exemption (where applicable)

/**
 * Interface representing a tax type entry.
 * Contains the code and its corresponding description.
 */
export interface TaxType {
  code: TaxTypeCode
  description: string
}
