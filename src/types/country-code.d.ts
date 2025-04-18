/**
 * Represents the allowed ISO-3166 alpha-3 country codes.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/countries/
 */
export type CountryCode =
  | "ABW"
  | "AFG"
  | "AGO"
  | "AIA"
  | "ALA"
  | "ALB"
  | "AND"
  | "ANT"
  | "ARE"
  | "ARG"
  | "ARM"
  | "ASM"
  | "ATA"
  | "ATF"
  | "ATG"
  | "AUS"
  | "AUT"
  | "AZE"
  | "BDI"
  | "BEL"
  | "BEN"
  | "BES"
  | "BFA"
  | "BGD"
  | "BGR"
  | "BHR"
  | "BHS"
  | "BIH"
  | "BLM"
  | "BLR"
  | "BLZ"
  | "BMU"
  | "BOL"
  | "BRA"
  | "BRB"
  | "BRN"
  | "BTN"
  | "BVT"
  | "BWA"
  | "CAF"
  | "CAN"
  | "CCK"
  | "CHE"
  | "CHL"
  | "CHN"
  | "CIV"
  | "CMR"
  | "COD"
  | "COG"
  | "COK"
  | "COL"
  | "COM"
  | "CPV"
  | "CRI"
  | "CUB"
  | "CUW"
  | "CXR"
  | "CYM"
  | "CYP"
  | "CZE"
  | "DEU"
  | "DJI"
  | "DMA"
  | "DNK"
  | "DOM"
  | "DZA"
  | "ECU"
  | "EGY"
  | "ERI"
  | "ESH"
  | "ESP"
  | "EST"
  | "ETH"
  | "FIN"
  | "FJI"
  | "FLK"
  | "FRA"
  | "FRO"
  | "FSM"
  | "GAB"
  | "GBR"
  | "GEO"
  | "GGY"
  | "GHA"
  | "GIB"
  | "GIN"
  | "GLP"
  | "GMB"
  | "GNB"
  | "GNQ"
  | "GRC"
  | "GRD"
  | "GRL"
  | "GTM"
  | "GUF"
  | "GUM"
  | "GUY"
  | "HKG"
  | "HMD"
  | "HND"
  | "HRV"
  | "HTI"
  | "HUN"
  | "IDN"
  | "IMN"
  | "IND"
  | "IOT"
  | "IRL"
  | "IRN"
  | "IRQ"
  | "ISL"
  | "ISR"
  | "ITA"
  | "JAM"
  | "JEY"
  | "JOR"
  | "JPN"
  | "KAZ"
  | "KEN"
  | "KGZ"
  | "KHM"
  | "KIR"
  | "KNA"
  | "KOR"
  | "KWT"
  | "LAO"
  | "LBN"
  | "LBR"
  | "LBY"
  | "LCA"
  | "LIE"
  | "LKA"
  | "LSO"
  | "LTU"
  | "LUX"
  | "LVA"
  | "MAC"
  | "MAF"
  | "MAR"
  | "MCO"
  | "MDA"
  | "MDG"
  | "MDV"
  | "MEX"
  | "MHL"
  | "MKD"
  | "MLI"
  | "MLT"
  | "MMR"
  | "MNE"
  | "MNG"
  | "MNP"
  | "MOZ"
  | "MRT"
  | "MSR"
  | "MTQ"
  | "MUS"
  | "MWI"
  | "MYS"
  | "MYT"
  | "NAM"
  | "NCL"
  | "NER"
  | "NFK"
  | "NGA"
  | "NIC"
  | "NIU"
  | "NLD"
  | "NOR"
  | "NPL"
  | "NRU"
  | "NZL"
  | "OMN"
  | "PAK"
  | "PAN"
  | "PCN"
  | "PER"
  | "PHL"
  | "PLW"
  | "PNG"
  | "POL"
  | "PRI"
  | "PRK"
  | "PRT"
  | "PRY"
  | "PSE"
  | "PYF"
  | "QAT"
  | "REU"
  | "ROU"
  | "RUS"
  | "RWA"
  | "SAU"
  | "SDN"
  | "SEN"
  | "SGP"
  | "SGS"
  | "SHN"
  | "SJM"
  | "SLB"
  | "SLE"
  | "SLV"
  | "SMR"
  | "SOM"
  | "SPM"
  | "SRB"
  | "SSD"
  | "STP"
  | "SUR"
  | "SVK"
  | "SVN"
  | "SWE"
  | "SWZ"
  | "SXM"
  | "SYC"
  | "SYR"
  | "TCA"
  | "TCD"
  | "TGO"
  | "THA"
  | "TJK"
  | "TKL"
  | "TKM"
  | "TLS"
  | "TON"
  | "TTO"
  | "TUN"
  | "TUR"
  | "TUV"
  | "TWN"
  | "TZA"
  | "UGA"
  | "UKR"
  | "UMI"
  | "URY"
  | "USA"
  | "UZB"
  | "VAT"
  | "VCT"
  | "VEN"
  | "VGB"
  | "VIR"
  | "VNM"
  | "VUT"
  | "WLF"
  | "WSM"
  | "XKX"
  | "YEM"
  | "ZAF"
  | "ZMB"
  | "ZWE"

/**
 * Enum representing the allowed ISO-3166 alpha-3 country codes.
 * Provides a more readable way to reference country codes.
 *
 * @example
 * const malaysiaCode = CountryCodeEnum.MYS;
 * console.log(malaysiaCode); // Output: "MYS"
 */
export enum CountryCodeEnum {
  ABW = "ABW",
  AFG = "AFG",
  AGO = "AGO",
  AIA = "AIA",
  ALA = "ALA",
  ALB = "ALB",
  AND = "AND",
  ANT = "ANT",
  ARE = "ARE",
  ARG = "ARG",
  ARM = "ARM",
  ASM = "ASM",
  ATA = "ATA",
  ATF = "ATF",
  ATG = "ATG",
  AUS = "AUS",
  AUT = "AUT",
  AZE = "AZE",
  BDI = "BDI",
  BEL = "BEL",
  BEN = "BEN",
  BES = "BES",
  BFA = "BFA",
  BGD = "BGD",
  BGR = "BGR",
  BHR = "BHR",
  BHS = "BHS",
  BIH = "BIH",
  BLM = "BLM",
  BLR = "BLR",
  BLZ = "BLZ",
  BMU = "BMU",
  BOL = "BOL",
  BRA = "BRA",
  BRB = "BRB",
  BRN = "BRN",
  BTN = "BTN",
  BVT = "BVT",
  BWA = "BWA",
  CAF = "CAF",
  CAN = "CAN",
  CCK = "CCK",
  CHE = "CHE",
  CHL = "CHL",
  CHN = "CHN",
  CIV = "CIV",
  CMR = "CMR",
  COD = "COD",
  COG = "COG",
  COK = "COK",
  COL = "COL",
  COM = "COM",
  CPV = "CPV",
  CRI = "CRI",
  CUB = "CUB",
  CUW = "CUW",
  CXR = "CXR",
  CYM = "CYM",
  CYP = "CYP",
  CZE = "CZE",
  DEU = "DEU",
  DJI = "DJI",
  DMA = "DMA",
  DNK = "DNK",
  DOM = "DOM",
  DZA = "DZA",
  ECU = "ECU",
  EGY = "EGY",
  ERI = "ERI",
  ESH = "ESH",
  ESP = "ESP",
  EST = "EST",
  ETH = "ETH",
  FIN = "FIN",
  FJI = "FJI",
  FLK = "FLK",
  FRA = "FRA",
  FRO = "FRO",
  FSM = "FSM",
  GAB = "GAB",
  GBR = "GBR",
  GEO = "GEO",
  GGY = "GGY",
  GHA = "GHA",
  GIB = "GIB",
  GIN = "GIN",
  GLP = "GLP",
  GMB = "GMB",
  GNB = "GNB",
  GNQ = "GNQ",
  GRC = "GRC",
  GRD = "GRD",
  GRL = "GRL",
  GTM = "GTM",
  GUF = "GUF",
  GUM = "GUM",
  GUY = "GUY",
  HKG = "HKG",
  HMD = "HMD",
  HND = "HND",
  HRV = "HRV",
  HTI = "HTI",
  HUN = "HUN",
  IDN = "IDN",
  IMN = "IMN",
  IND = "IND",
  IOT = "IOT",
  IRL = "IRL",
  IRN = "IRN",
  IRQ = "IRQ",
  ISL = "ISL",
  ISR = "ISR",
  ITA = "ITA",
  JAM = "JAM",
  JEY = "JEY",
  JOR = "JOR",
  JPN = "JPN",
  KAZ = "KAZ",
  KEN = "KEN",
  KGZ = "KGZ",
  KHM = "KHM",
  KIR = "KIR",
  KNA = "KNA",
  KOR = "KOR",
  KWT = "KWT",
  LAO = "LAO",
  LBN = "LBN",
  LBR = "LBR",
  LBY = "LBY",
  LCA = "LCA",
  LIE = "LIE",
  LKA = "LKA",
  LSO = "LSO",
  LTU = "LTU",
  LUX = "LUX",
  LVA = "LVA",
  MAC = "MAC",
  MAF = "MAF",
  MAR = "MAR",
  MCO = "MCO",
  MDA = "MDA",
  MDG = "MDG",
  MDV = "MDV",
  MEX = "MEX",
  MHL = "MHL",
  MKD = "MKD",
  MLI = "MLI",
  MLT = "MLT",
  MMR = "MMR",
  MNE = "MNE",
  MNG = "MNG",
  MNP = "MNP",
  MOZ = "MOZ",
  MRT = "MRT",
  MSR = "MSR",
  MTQ = "MTQ",
  MUS = "MUS",
  MWI = "MWI",
  MYS = "MYS",
  MYT = "MYT",
  NAM = "NAM",
  NCL = "NCL",
  NER = "NER",
  NFK = "NFK",
  NGA = "NGA",
  NIC = "NIC",
  NIU = "NIU",
  NLD = "NLD",
  NOR = "NOR",
  NPL = "NPL",
  NRU = "NRU",
  NZL = "NZL",
  OMN = "OMN",
  PAK = "PAK",
  PAN = "PAN",
  PCN = "PCN",
  PER = "PER",
  PHL = "PHL",
  PLW = "PLW",
  PNG = "PNG",
  POL = "POL",
  PRI = "PRI",
  PRK = "PRK",
  PRT = "PRT",
  PRY = "PRY",
  PSE = "PSE",
  PYF = "PYF",
  QAT = "QAT",
  REU = "REU",
  ROU = "ROU",
  RUS = "RUS",
  RWA = "RWA",
  SAU = "SAU",
  SDN = "SDN",
  SEN = "SEN",
  SGP = "SGP",
  SGS = "SGS",
  SHN = "SHN",
  SJM = "SJM",
  SLB = "SLB",
  SLE = "SLE",
  SLV = "SLV",
  SMR = "SMR",
  SOM = "SOM",
  SPM = "SPM",
  SRB = "SRB",
  SSD = "SSD",
  STP = "STP",
  SUR = "SUR",
  SVK = "SVK",
  SVN = "SVN",
  SWE = "SWE",
  SWZ = "SWZ",
  SXM = "SXM",
  SYC = "SYC",
  SYR = "SYR",
  TCA = "TCA",
  TCD = "TCD",
  TGO = "TGO",
  THA = "THA",
  TJK = "TJK",
  TKL = "TKL",
  TKM = "TKM",
  TLS = "TLS",
  TON = "TON",
  TTO = "TTO",
  TUN = "TUN",
  TUR = "TUR",
  TUV = "TUV",
  TWN = "TWN",
  TZA = "TZA",
  UGA = "UGA",
  UKR = "UKR",
  UMI = "UMI",
  URY = "URY",
  USA = "USA",
  UZB = "UZB",
  VAT = "VAT",
  VCT = "VCT",
  VEN = "VEN",
  VGB = "VGB",
  VIR = "VIR",
  VNM = "VNM",
  VUT = "VUT",
  WLF = "WLF",
  WSM = "WSM",
  XKX = "XKX",
  YEM = "YEM",
  ZAF = "ZAF",
  ZMB = "ZMB",
  ZWE = "ZWE",
}

/**
 * Enum mapping ISO-3166 alpha-3 country codes to their corresponding country names.
 * Provides a way to easily retrieve the name of a country using its code.
 *
 * @example
 * import { CountryCodeEnum, CountryNameEnum } from './country-code';
 * const malaysiaName = CountryNameEnum[CountryCodeEnum.MYS];
 * console.log(malaysiaName); // Output: MALAYSIA
 */
export enum CountryNameEnum {
  ABW = "ARUBA",
  AFG = "AFGHANISTAN",
  AGO = "ANGOLA",
  AIA = "ANGUILLA",
  ALA = "ALAND ISLANDS",
  ALB = "ALBANIA",
  AND = "ANDORA",
  ANT = "NETHERLANDS ANTILLES",
  ARE = "UNITED ARAB EMIRATES",
  ARG = "ARGENTINA",
  ARM = "ARMENIA",
  ASM = "AMERICAN SAMOA",
  ATA = "ANTARCTICA",
  ATF = "FRENCH SOUTHERN TERRITORIES",
  ATG = "ANTIGUA AND BARBUDA",
  AUS = "AUSTRALIA",
  AUT = "AUSTRIA",
  AZE = "AZERBAIDJAN",
  BDI = "BURUNDI",
  BEL = "BELGIUM",
  BEN = "BENIN",
  BES = "BONAIRE, SINT EUSTATIUS AND SABA",
  BFA = "BURKINA FASO",
  BGD = "BANGLADESH",
  BGR = "BULGARIA",
  BHR = "BAHRAIN",
  BHS = "BAHAMAS",
  BIH = "BOSNIA AND HERZEGOVINA",
  BLM = "SAINT BARTHELEMY",
  BLR = "BELARUS",
  BLZ = "BELIZE",
  BMU = "BERMUDA",
  BOL = "BOLIVIA",
  BRA = "BRAZIL",
  BRB = "BARBADOS",
  BRN = "BRUNEI DARUSSALAM",
  BTN = "BHUTAN",
  BVT = "BOUVET ISLAND",
  BWA = "BOTSWANA",
  CAF = "CENTRAL AFRICAN REPUBLIC",
  CAN = "CANADA",
  CCK = "COCOS ISLAND",
  CHE = "SWITZERLAND",
  CHL = "CHILE",
  CHN = "CHINA",
  CIV = "COTE D'IVOIRE",
  CMR = "CAMEROON",
  COD = "CONGO, THE DEMOCRATIC REPUBLIC",
  COG = "CONGO",
  COK = "COOK ISLANDS",
  COL = "COLOMBIA",
  COM = "COMOROS",
  CPV = "CAPE VERDE",
  CRI = "COSTA RICA",
  CUB = "CUBA",
  CUW = "CURACAO",
  CXR = "CHRISTMAS ISLANDS",
  CYM = "CAYMAN ISLANDS",
  CYP = "CYPRUS",
  CZE = "CZECH REPUBLIC",
  DEU = "GERMANY",
  DJI = "DJIBOUTI",
  DMA = "DOMINICA",
  DNK = "DENMARK",
  DOM = "DOMINICAN REPUBLIC",
  DZA = "ALGERIA",
  ECU = "ECUADOR",
  EGY = "EGYPT",
  ERI = "ERITREA",
  ESH = "WESTERN SAHARA",
  ESP = "SPAIN",
  EST = "ESTONIA",
  ETH = "ETHIOPIA",
  FIN = "FINLAND",
  FJI = "FIJI",
  FLK = "FALKLAND ISLANDS (MALVINAS)",
  FRA = "FRANCE",
  FRO = "FAEROE ISLANDS",
  FSM = "MICRONESIA, FEDERATED STATES OF",
  GAB = "GABON",
  GBR = "UNITED KINGDOM",
  GEO = "GEORGIA",
  GGY = "GUERNSEY",
  GHA = "GHANA",
  GIB = "GIBRALTAR",
  GIN = "GUINEA",
  GLP = "GUADELOUPE",
  GMB = "GAMBIA",
  GNB = "GUINEA-BISSAU",
  GNQ = "EQUATORIAL GUINEA",
  GRC = "GREECE",
  GRD = "GRENADA",
  GRL = "GREENLAND",
  GTM = "GUATEMALA",
  GUF = "FRENCH GUIANA",
  GUM = "GUAM",
  GUY = "GUYANA",
  HKG = "HONG KONG",
  HMD = "HEARD AND MCDONALD ISLANDS",
  HND = "HONDURAS",
  HRV = "CROATIA",
  HTI = "HAITI",
  HUN = "HUNGARY",
  IDN = "INDONESIA",
  IMN = "ISLE OF MAN",
  IND = "INDIA",
  IOT = "BRITISH INDIAN OCEAN TERRITORY",
  IRL = "IRELAND",
  IRN = "IRAN",
  IRQ = "IRAQ",
  ISL = "ICELAND",
  ISR = "ISRAEL",
  ITA = "ITALY",
  JAM = "JAMAICA",
  JEY = "JERSEY (CHANNEL ISLANDS)",
  JOR = "JORDAN",
  JPN = "JAPAN",
  KAZ = "KAZAKHSTAN",
  KEN = "KENYA",
  KGZ = "KYRGYZSTAN",
  KHM = "CAMBODIA",
  KIR = "KIRIBATI",
  KNA = "ST.KITTS AND NEVIS",
  KOR = "THE REPUBLIC OF KOREA",
  KWT = "KUWAIT",
  LAO = "LAOS",
  LBN = "LEBANON",
  LBR = "LIBERIA",
  LBY = "LIBYAN ARAB JAMAHIRIYA",
  LCA = "SAINT LUCIA",
  LIE = "LIECHTENSTEIN",
  LKA = "SRI LANKA",
  LSO = "LESOTHO",
  LTU = "LITHUANIA",
  LUX = "LUXEMBOURG",
  LVA = "LATVIA",
  MAC = "MACAO",
  MAF = "SAINT MARTIN (FRENCH PART)",
  MAR = "MOROCCO",
  MCO = "MONACO",
  MDA = "MOLDOVA, REPUBLIC OF",
  MDG = "MADAGASCAR",
  MDV = "MALDIVES",
  MEX = "MEXICO",
  MHL = "MARSHALL ISLANDS",
  MKD = "MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF",
  MLI = "MALI",
  MLT = "MALTA",
  MMR = "MYANMAR",
  MNE = "MONTENEGRO",
  MNG = "MONGOLIA",
  MNP = "NORTHERN MARIANA ISLANDS",
  MOZ = "MOZAMBIQUE",
  MRT = "MAURITANIA",
  MSR = "MONTSERRAT",
  MTQ = "MARTINIQUE",
  MUS = "MAURITIUS",
  MWI = "MALAWI",
  MYS = "MALAYSIA",
  MYT = "MAYOTTE",
  NAM = "NAMIBIA",
  NCL = "NEW CALEDONIA",
  NER = "NIGER",
  NFK = "NORFOLK ISLAND",
  NGA = "NIGERIA",
  NIC = "NICARAGUA",
  NIU = "NIUE",
  NLD = "NETHERLANDS",
  NOR = "NORWAY",
  NPL = "NEPAL",
  NRU = "NAURU",
  NZL = "NEW ZEALAND",
  OMN = "OMAN",
  PAK = "PAKISTAN",
  PAN = "PANAMA",
  PCN = "PITCAIRN",
  PER = "PERU",
  PHL = "PHILIPPINES",
  PLW = "PALAU",
  PNG = "PAPUA NEW GUINEA",
  POL = "POLAND",
  PRI = "PUERTO RICO",
  PRK = "DEMOC.PEOPLES REP.OF KOREA",
  PRT = "PORTUGAL",
  PRY = "PARAGUAY",
  PSE = "PALESTINIAN TERRITORY, OCCUPIED",
  PYF = "FRENCH POLYNESIA",
  QAT = "QATAR",
  REU = "REUNION",
  ROU = "ROMANIA",
  RUS = "RUSSIAN FEDERATION (USSR)",
  RWA = "RWANDA",
  SAU = "SAUDI ARABIA",
  SDN = "SUDAN",
  SEN = "SENEGAL",
  SGP = "SINGAPORE",
  SGS = "SOUTH GEORGIA AND THE SOUTH SANDWICH ISLAND",
  SHN = "ST. HELENA",
  SJM = "SVALBARD AND JAN MAYEN ISLANDS",
  SLB = "SOLOMON ISLANDS",
  SLE = "SIERRA LEONE",
  SLV = "EL SALVADOR",
  SMR = "SAN MARINO",
  SOM = "SOMALIA",
  SPM = "ST. PIERRE AND MIQUELON",
  SRB = "SERBIA",
  SSD = "SOUTH SUDAN",
  STP = "SAO TOME AND PRINCIPE",
  SUR = "SURINAME",
  SVK = "SLOVAK REPUBLIC",
  SVN = "SLOVENIA",
  SWE = "SWEDEN",
  SWZ = "ESWATINI, KINGDOM OF (SWAZILAND)",
  SXM = "SINT MAARTEN (DUTCH PART)",
  SYC = "SEYCHELLES",
  SYR = "SYRIAN ARAB REPUBLIC",
  TCA = "TURKS AND CAICOS ISLANDS",
  TCD = "CHAD",
  TGO = "TOGO",
  THA = "THAILAND",
  TJK = "TAJIKISTAN",
  TKL = "TOKELAU",
  TKM = "TURKMENISTAN",
  TLS = "TIMOR-LESTE",
  TON = "TONGA",
  TTO = "TRINIDAD AND TOBAGO",
  TUN = "TUNISIA",
  TUR = "TURKIYE",
  TUV = "TUVALU",
  TWN = "TAIWAN",
  TZA = "TANZANIA UNITED REPUBLIC",
  UGA = "UGANDA",
  UKR = "UKRAINE",
  UMI = "UNITED STATES MINOR OUTLYING ISLANDS",
  URY = "URUGUAY",
  USA = "UNITED STATES OF AMERICA",
  UZB = "UZBEKISTAN",
  VAT = "VATICAN CITY STATE (HOLY SEE)",
  VCT = "SAINT VINCENT AND GRENADINES",
  VEN = "VENEZUELA",
  VGB = "VIRGIN ISLANDS(BRITISH)",
  VIR = "VIRGIN ISLANDS(US)",
  VNM = "VIETNAM",
  VUT = "VANUATU",
  WLF = "WALLIS AND FUTUNA ISLANDS",
  WSM = "SAMOA",
  XKX = "KOSOVO",
  YEM = "YEMEN",
  ZAF = "SOUTH AFRICA",
  ZMB = "ZAMBIA",
  ZWE = "ZIMBABWE",
}

/**
 * Interface representing a country code entry.
 * Contains the ISO-3166 alpha-3 code and the country name.
 */
export interface Country {
  code: CountryCode
  name: string
}
