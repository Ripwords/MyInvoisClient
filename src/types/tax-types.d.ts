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
 * Enum representing the allowed tax type codes with descriptive names.
 * Provides a more readable way to reference tax types.
 *
 * @example
 * const code = TaxTypeCodeEnum.SalesTax;
 * console.log(code); // Output: "01"
 */
export enum TaxTypeCodeEnum {
  SalesTax = '01',
  ServiceTax = '02',
  TourismTax = '03',
  HighValueGoodsTax = '04',
  SalesTaxLowValueGoods = '05',
  NotApplicable = '06',
  TaxExemption = 'E',
}

/**
 * Interface representing a tax type entry.
 * Contains the code and its corresponding description.
 */
export interface TaxType {
  code: TaxTypeCode
  description: string
}
