/**
 * Represents the allowed codes for Malaysian states and federal territories.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/state-codes/
 */
export type StateCode =
  | '01' // Johor
  | '02' // Kedah
  | '03' // Kelantan
  | '04' // Melaka
  | '05' // Negeri Sembilan
  | '06' // Pahang
  | '07' // Pulau Pinang
  | '08' // Perak
  | '09' // Perlis
  | '10' // Selangor
  | '11' // Terengganu
  | '12' // Sabah
  | '13' // Sarawak
  | '14' // Wilayah Persekutuan Kuala Lumpur
  | '15' // Wilayah Persekutuan Labuan
  | '16' // Wilayah Persekutuan Putrajaya
  | '17' // Not Applicable

/**
 * Enum representing the allowed state codes with descriptive names.
 * Provides a more readable way to reference states.
 *
 * @example
 * const code = StateCodeEnum.Selangor;
 * console.log(code); // Output: "10"
 */
export enum StateCodeEnum {
  Johor = '01',
  Kedah = '02',
  Kelantan = '03',
  Melaka = '04',
  NegeriSembilan = '05',
  Pahang = '06',
  PulauPinang = '07',
  Perak = '08',
  Perlis = '09',
  Selangor = '10',
  Terengganu = '11',
  Sabah = '12',
  Sarawak = '13',
  WPKualaLumpur = '14',
  WPLabuan = '15',
  WPPutrajaya = '16',
  NotApplicable = '17',
}

/**
 * Interface representing a state code entry.
 * Contains the code and its corresponding name.
 */
export interface State {
  code: StateCode
  name: string
}
