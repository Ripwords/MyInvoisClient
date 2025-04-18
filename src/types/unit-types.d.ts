/**
 * Represents the allowed codes for Unit of Measurement types.
 * Based on UN/ECE Recommendation 20, Revision 17 (2021) as per the documentation:
 * https://sdk.myinvois.hasil.gov.my/codes/unit-types/
 * NOTE: This list is incomplete as the provided documentation snippet omitted a large number of codes.
 */
export type UnitTypeCode =
  | '10'
  | '11'
  | '13'
  | '14'
  | '15'
  | '1I'
  | '20'
  | '21'
  | '22'
  | '23'
  | '24'
  | '25'
  | '27'
  | '28'
  | '2A'
  | '2B'
  | '2C'
  | '2G'
  | '2H'
  | '2I'
  | '2J'
  | '2K'
  | '2L'
  | '2M'
  | '2N'
  | '2P'
  | '2Q'
  | '2R'
  | '2U'
  | '2X'
  | '2Y'
  | '2Z'
  | '33'
  | '34'
  | '35'
  | '37'
  | '38'
  | '3B'
  | '3C'
  | '40'
  | '41'
  | '4C'
  | '4G'
  | '4H'
  | '4K'
  | '4L'
  | '4M'
  | '4N'
  | '4O'
  | '4P'
  | '4Q'
  | '4R'
  | '4T'
  | '4U'
  | '4W'
  | '4X'
  | '56'
  | '57'
  | '58'
  | '59'
  | '5A'
  | '5B'
  | '5E'
  | '5J'
  | '60'
  | '61'
  | '74'
  | '77'
  | '80'
  | '81'
  | '85'
  | '87'
  | '89'
  | '91'
  | 'A10'
  | 'A11'
  | 'A12'
  | 'A13'
  | 'A14'
  | 'A15'
  | 'A16'
  | 'A17'
  | 'A18'
  | 'A19'
  | 'A2'
  | 'A20'
  | 'A21'
  | 'A22'
  | 'A23'
  | 'A24'
  | 'A26'
  | 'A27'
  | 'A28'
  | 'A29'
  | 'A3'
  | 'A30'
  | 'A31'
  | 'A32'
  | 'A33'
  | 'A34'
  | 'A35'
  | 'A36'
  | 'A37'
  | 'A38'
  | 'A39'
  | 'A4'
  | 'A40'
  | 'A41'
  | 'A42'
  | 'A43'
  | 'A44'
  | 'A45'
  | 'A47'
  | 'A48'
  | 'A49'
  | 'A5'
  | 'A53'
  | 'A54'
  | 'A55'
  | 'A56'
  | 'A59'
  | 'A6'
  | 'A68'
  | 'A69'
  | 'A7'
  | 'A70'
  | 'A71'
  | 'A73'
  | 'A74'
  | 'A75'
  | 'A76'
  | 'A8'
  | 'A84'
  | 'A85'
  | 'A86'
  | 'A87'
  | 'A88'
  | 'A89'
  // ... (Codes omitted in provided documentation) ...
  | 'XQP'
  | 'XQQ'
  | 'XQR'
  | 'XQS'
  | 'XRD'
  | 'XRG'
  | 'XRJ'
  | 'XRK'
  | 'XRL'
  | 'XRO'
  | 'XRT'
  | 'XRZ'
  | 'XSA'
  | 'XSB'
  | 'XSC'
  | 'XSD'
  | 'XSE'
  | 'XSH'
  | 'XSI'
  | 'XSK'
  | 'XSL'
  | 'XSM'
  | 'XSO'
  | 'XSP'
  | 'XSS'
  | 'XST'
  | 'XSU'
  | 'XSV'
  | 'XSW'
  | 'XSX'
  | 'XSY'
  | 'XSZ'
  | 'XT1'
  | 'XTB'
  | 'XTC'
  | 'XTD'
  | 'XTE'
  | 'XTG'
  | 'XTI'
  | 'XTK'
  | 'XTL'
  | 'XTN'
  | 'XTO'
  | 'XTR'
  | 'XTS'
  | 'XTT'
  | 'XTU'
  | 'XTV'
  | 'XTW'
  | 'XTY'
  | 'XTZ'
  | 'XUC'
  | 'XUN'
  | 'XVA'
  | 'XVG'
  | 'XVI'
  | 'XVK'
  | 'XVL'
  | 'XVN'
  | 'XVO'
  | 'XVP'
  | 'XVQ'
  | 'XVR'
  | 'XVS'
  | 'XVY'
  | 'XWA'
  | 'XWB'
  | 'XWC'
  | 'XWD'
  | 'XWF'
  | 'XWG'
  | 'XWH'
  | 'XWJ'
  | 'XWK'
  | 'XWL'
  | 'XWM'
  | 'XWN'
  | 'XWP'
  | 'XWQ'
  | 'XWR'
  | 'XWS'
  | 'XWT'
  | 'XWU'
  | 'XWV'
  | 'XWW'
  | 'XWX'
  | 'XWY'
  | 'XWZ'
  | 'XXA'
  | 'XXB'
  | 'XXC'
  | 'XXD'
  | 'XXF'
  | 'XXG'
  | 'XXH'
  | 'XXJ'
  | 'XXK'
  | 'XYA'
  | 'XYB'
  | 'XYC'
  | 'XYD'
  | 'XYF'
  | 'XYG'
  | 'XYH'
  | 'XYJ'
  | 'XYK'
  | 'XYL'
  | 'XYM'
  | 'XYN'
  | 'XYP'
  | 'XYQ'
  | 'XYR'
  | 'XYS'
  | 'XYT'
  | 'XYV'
  | 'XYW'
  | 'XYX'
  | 'XYY'
  | 'XYZ'
  | 'XZA'
  | 'XZB'
  | 'XZC'
  | 'XZD'
  | 'XZF'
  | 'XZG'
  | 'XZH'
  | 'XZJ'
  | 'XZK'
  | 'XZL'
  | 'XZM'
  | 'XZN'
  | 'XZP'
  | 'XZQ'
  | 'XZR'
  | 'XZS'
  | 'XZT'
  | 'XZU'
  | 'XZV'
  | 'XZW'
  | 'XZX'
  | 'XZY'
  | 'XZZ'

/**
 * Enum representing the allowed Unit of Measurement codes with descriptive names.
 * Provides a more readable way to reference unit types.
 * NOTE: This enum is incomplete as the provided documentation snippet omitted a large number of codes.
 *
 * @example
 * const code = UnitTypeCodeEnum.KilogramPerSquareMetre;
 * console.log(code); // Output: "28"
 */
export enum UnitTypeCodeEnum {
  Group = '10',
  Outfit = '11',
  Ration = '13',
  Shot = '14',
  StickMilitary = '15',
  FixedRate = '1I',
  TwentyFootContainer = '20',
  FortyFootContainer = '21',
  DecilitrePerGram = '22',
  GramPerCubicCentimetre = '23',
  TheoreticalPound = '24',
  GramPerSquareCentimetre = '25',
  TheoreticalTon = '27',
  KilogramPerSquareMetre = '28',
  RadianPerSecond = '2A',
  RadianPerSecondSquared = '2B',
  Roentgen = '2C',
  VoltAC = '2G',
  VoltDC = '2H',
  BritishThermalUnitInternationalTablePerHour = '2I',
  CubicCentimetrePerSecond = '2J',
  CubicFootPerHour = '2K',
  CubicFootPerMinute = '2L',
  CentimetrePerSecond = '2M',
  Decibel = '2N',
  Kilobyte = '2P',
  Kilobecquerel = '2Q',
  Kilocurie = '2R',
  Megagram = '2U',
  MetrePerMinute = '2X',
  Milliroentgen = '2Y',
  Millivolt = '2Z',
  KilopascalSquareMetrePerGram = '33',
  KilopascalPerMillimetre = '34',
  MillilitrePerSquareCentimetreSecond = '35',
  OuncePerSquareFoot = '37',
  OuncePerSquareFootPer0_01inch = '38',
  Megajoule = '3B',
  Manmonth = '3C',
  MillilitrePerSecond = '40',
  MillilitrePerMinute = '41',
  Centistokes = '4C',
  Microlitre = '4G',
  MicrometreMicron = '4H',
  Milliampere = '4K',
  Megabyte = '4L',
  MilligramPerHour = '4M',
  Megabecquerel = '4N',
  Microfarad = '4O',
  NewtonPerMetre = '4P',
  OunceInch = '4Q',
  OunceFoot = '4R',
  Picofarad = '4T',
  PoundPerHour = '4U',
  TonUSPerHour = '4W',
  KilolitrePerHour = '4X',
  Sitas = '56',
  Mesh = '57',
  NetKilogram = '58',
  PartPerMillion = '59',
  BarrelUSPerMinute = '5A',
  Batch = '5B',
  MMSCFDay = '5E',
  HydraulicHorsePower = '5J',
  PercentWeight = '60',
  PartPerBillionUS = '61',
  Millipascal = '74',
  MilliInch = '77',
  PoundPerSquareInchAbsolute = '80',
  Henry = '81',
  FootPoundForce = '85',
  PoundPerCubicFoot = '87',
  Poise = '89',
  Stokes = '91',
  AmpereSquareMetrePerJouleSecond = 'A10',
  Angstrom = 'A11',
  AstronomicalUnit = 'A12',
  Attojoule = 'A13',
  Barn = 'A14',
  BarnPerElectronvolt = 'A15',
  BarnPerSteradianElectronvolt = 'A16',
  BarnPerSteradian = 'A17',
  BecquerelPerKilogram = 'A18',
  BecquerelPerCubicMetre = 'A19',
  AmperePerCentimetre = 'A2',
  BritishThermalUnitInternationalTablePerSecondSquareFootDegreeRankine = 'A20',
  BritishThermalUnitInternationalTablePerPoundDegreeRankine = 'A21',
  BritishThermalUnitInternationalTablePerSecondFootDegreeRankine = 'A22',
  BritishThermalUnitInternationalTablePerHourSquareFootDegreeRankine = 'A23',
  CandelaPerSquareMetre = 'A24',
  CoulombMetre = 'A26',
  CoulombMetreSquaredPerVolt = 'A27',
  CoulombPerCubicCentimetre = 'A28',
  CoulombPerCubicMetre = 'A29',
  AmperePerMillimetre = 'A3',
  CoulombPerCubicMillimetre = 'A30',
  CoulombPerKilogramSecond = 'A31',
  CoulombPerMole = 'A32',
  CoulombPerSquareCentimetre = 'A33',
  CoulombPerSquareMetre = 'A34',
  CoulombPerSquareMillimetre = 'A35',
  CubicCentimetrePerMole = 'A36',
  CubicDecimetrePerMole = 'A37',
  CubicMetrePerCoulomb = 'A38',
  CubicMetrePerKilogram = 'A39',
  AmperePerSquareCentimetre = 'A4',
  CubicMetrePerMole = 'A40',
  AmperePerSquareMetre = 'A41',
  CuriePerKilogram = 'A42',
  DeadweightTonnage = 'A43',
  Decalitre = 'A44',
  Decametre = 'A45',
  Decitex = 'A47',
  DegreeRankine = 'A48',
  Denier = 'A49',
  AmpereSquareMetre = 'A5',
  Electronvolt = 'A53',
  ElectronvoltPerMetre = 'A54',
  ElectronvoltSquareMetre = 'A55',
  ElectronvoltSquareMetrePerKilogram = 'A56',
  _8PartCloudCover = 'A59', // Enum member names cannot start with a number
  AmperePerSquareMetreKelvinSquared = 'A6',
  Exajoule = 'A68',
  FaradPerMetre = 'A69',
  AmperePerSquareMillimetre = 'A7',
  Femtojoule = 'A70',
  Femtometre = 'A71',
  FootPerSecondSquared = 'A73',
  FootPoundForcePerSecond = 'A74',
  FreightTon = 'A75',
  Gal = 'A76',
  AmpereSecond = 'A8',
  GigacoulombPerCubicMetre = 'A84',
  Gigaelectronvolt = 'A85',
  Gigahertz = 'A86',
  Gigaohm = 'A87',
  GigaohmMetre = 'A88',
  Gigapascal = 'A89',
  // ... (Codes omitted in provided documentation) ...
  BoxWoodenNaturalWoodOrdinary = 'XQP',
  BoxWoodenNaturalWoodWithSiftProofWalls = 'XQQ',
  BoxPlasticExpanded = 'XQR',
  BoxPlasticSolid = 'XQS',
  Rod = 'XRD',
  Ring = 'XRG',
  RackClothingHanger = 'XRJ',
  Rack = 'XRK',
  Reel = 'XRL',
  Roll = 'XRO',
  Rednet = 'XRT',
  RodsInBundleBunchTruss = 'XRZ',
  Sack = 'XSA',
  Slab = 'XSB',
  CrateShallow = 'XSC',
  Spindle = 'XSD',
  SeaChest = 'XSE',
  Sachet = 'XSH',
  Skid = 'XSI',
  CaseSkeleton = 'XSK',
  Slipsheet = 'XSL',
  Sheetmetal = 'XSM',
  Spool = 'XSO',
  SheetPlasticWrapping = 'XSP',
  CaseSteel = 'XSS',
  Sheet = 'XST',
  Suitcase = 'XSU',
  EnvelopeSteel = 'XSV',
  Shrinkwrapped = 'XSW',
  Set = 'XSX',
  Sleeve = 'XSY',
  SheetsInBundleBunchTruss = 'XSZ',
  Tablet = 'XT1',
  Tub = 'XTB',
  TeaChest = 'XTC',
  TubeCollapsible = 'XTD',
  Tyre = 'XTE',
  TankContainerGeneric = 'XTG',
  Tierce = 'XTI',
  TankRectangular = 'XTK',
  TubWithLid = 'XTL',
  Tin = 'XTN',
  Tun = 'XTO',
  Trunk = 'XTR',
  Truss = 'XTS',
  BagTote = 'XTT',
  Tube = 'XTU',
  TubeWithNozzle = 'XTV',
  PalletTriwall = 'XTW',
  TankCylindrical = 'XTY',
  TubesInBundleBunchTruss = 'XTZ',
  Uncaged = 'XUC',
  Unit = 'XUN',
  Vat = 'XVA',
  BulkGasAt1031MbarAnd15C = 'XVG',
  Vial = 'XVI',
  Vanpack = 'XVK',
  BulkLiquid = 'XVL',
  Vehicle = 'XVN',
  BulkSolidLargeParticlesNodules = 'XVO',
  VacuumPacked = 'XVP',
  BulkLiquefiedGasAtAbnormalTemperaturePressure = 'XVQ',
  BulkSolidGranularParticlesGrains = 'XVR',
  BulkScrapMetal = 'XVS',
  BulkSolidFineParticlesPowders = 'XVY',
  IntermediateBulkContainer = 'XWA',
  Wickerbottle = 'XWB',
  IntermediateBulkContainerSteel = 'XWC',
  IntermediateBulkContainerAluminium = 'XWD',
  IntermediateBulkContainerMetal = 'XWF',
  IntermediateBulkContainerSteelPressurisedGreaterThan10Kpa = 'XWG',
  IntermediateBulkContainerAluminiumPressurisedGreaterThan10Kpa = 'XWH',
  IntermediateBulkContainerMetalPressure10Kpa = 'XWJ',
  IntermediateBulkContainerSteelLiquid = 'XWK',
  IntermediateBulkContainerAluminiumLiquid = 'XWL',
  IntermediateBulkContainerMetalLiquid = 'XWM',
  IntermediateBulkContainerWovenPlasticWithoutCoatLiner = 'XWN',
  IntermediateBulkContainerWovenPlasticCoated = 'XWP',
  IntermediateBulkContainerWovenPlasticWithLiner = 'XWQ',
  IntermediateBulkContainerWovenPlasticCoatedAndLiner = 'XWR',
  IntermediateBulkContainerPlasticFilm = 'XWS',
  IntermediateBulkContainerTextileWithOutCoatLiner = 'XWT',
  IntermediateBulkContainerNaturalWoodWithInnerLiner = 'XWU',
  IntermediateBulkContainerTextileCoated = 'XWV',
  IntermediateBulkContainerTextileWithLiner = 'XWW',
  IntermediateBulkContainerTextileCoatedAndLiner = 'XWX',
  IntermediateBulkContainerPlywoodWithInnerLiner = 'XWY',
  IntermediateBulkContainerReconstitutedWoodWithInnerLiner = 'XWZ',
  BagWovenPlasticWithoutInnerCoatLiner = 'XXA',
  BagWovenPlasticSiftProof = 'XXB',
  BagWovenPlasticWaterResistant = 'XXC',
  BagPlasticsFilm = 'XXD',
  BagTextileWithoutInnerCoatLiner = 'XXF',
  BagTextileSiftProof = 'XXG',
  BagTextileWaterResistant = 'XXH',
  BagPaperMultiWall = 'XXJ',
  BagPaperMultiWallWaterResistant = 'XXK',
  CompositePackagingPlasticReceptacleInSteelDrum = 'XYA',
  CompositePackagingPlasticReceptacleInSteelCrateBox = 'XYB',
  CompositePackagingPlasticReceptacleInAluminiumDrum = 'XYC',
  CompositePackagingPlasticReceptacleInAluminiumCrate = 'XYD',
  CompositePackagingPlasticReceptacleInWoodenBox = 'XYF',
  CompositePackagingPlasticReceptacleInPlywoodDrum = 'XYG',
  CompositePackagingPlasticReceptacleInPlywoodBox = 'XYH',
  CompositePackagingPlasticReceptacleInFibreDrum = 'XYJ',
  CompositePackagingPlasticReceptacleInFibreboardBox = 'XYK',
  CompositePackagingPlasticReceptacleInPlasticDrum = 'XYL',
  CompositePackagingPlasticReceptacleInSolidPlasticBox = 'XYM',
  CompositePackagingGlassReceptacleInSteelDrum = 'XYN',
  CompositePackagingGlassReceptacleInSteelCrateBox = 'XYP',
  CompositePackagingGlassReceptacleInAluminiumDrum = 'XYQ',
  CompositePackagingGlassReceptacleInAluminiumCrate = 'XYR',
  CompositePackagingGlassReceptacleInWoodenBox = 'XYS',
  CompositePackagingGlassReceptacleInPlywoodDrum = 'XYT',
  CompositePackagingGlassReceptacleInWickerworkHamper = 'XYV',
  CompositePackagingGlassReceptacleInFibreDrum = 'XYW',
  CompositePackagingGlassReceptacleInFibreboardBox = 'XYX',
  CompositePackagingGlassReceptacleInExpandablePlasticPack = 'XYY',
  CompositePackagingGlassReceptacleInSolidPlasticPack = 'XYZ',
  IntermediateBulkContainerPaperMultiWall = 'XZA',
  BagLarge = 'XZB',
  IntermediateBulkContainerPaperMultiWallWaterResistant = 'XZC',
  IntermediateBulkContainerRigidPlasticWithStructuralEquipmentSolids = 'XZD',
  IntermediateBulkContainerRigidPlasticFreestandingSolids = 'XZF',
  IntermediateBulkContainerRigidPlasticWithStructuralEquipmentPressurised = 'XZG',
  IntermediateBulkContainerRigidPlasticFreestandingPressurised = 'XZH',
  IntermediateBulkContainerRigidPlasticWithStructuralEquipmentLiquids = 'XZJ',
  IntermediateBulkContainerRigidPlasticFreestandingLiquids = 'XZK',
  IntermediateBulkContainerCompositeRigidPlasticSolids = 'XZL',
  IntermediateBulkContainerCompositeFlexiblePlasticSolids = 'XZM',
  IntermediateBulkContainerCompositeRigidPlasticPressurised = 'XZN',
  IntermediateBulkContainerCompositeFlexiblePlasticPressurised = 'XZP',
  IntermediateBulkContainerCompositeRigidPlasticLiquids = 'XZQ',
  IntermediateBulkContainerCompositeFlexiblePlasticLiquids = 'XZR',
  IntermediateBulkContainerComposite = 'XZS',
  IntermediateBulkContainerFibreboard = 'XZT',
  IntermediateBulkContainerFlexible = 'XZU',
  IntermediateBulkContainerMetalOtherThanSteel = 'XZV',
  IntermediateBulkContainerNaturalWood = 'XZW',
  IntermediateBulkContainerPlywood = 'XZX',
  IntermediateBulkContainerReconstitutedWood = 'XZY',
  MutuallyDefined = 'XZZ',
}

/**
 * Interface representing a Unit of Measurement entry.
 * Contains the code and its corresponding name.
 */
export interface UnitType {
  code: UnitTypeCode
  name: string
}
