/**
 * Represents the allowed classification codes for e-Invoice items.
 * Based on the documentation: https://sdk.myinvois.hasil.gov.my/codes/classification-codes/
 */
export type ClassificationCode =
  | '001' // Breastfeeding equipment
  | '002' // Child care centres and kindergartens fees
  | '003' // Computer, smartphone or tablet
  | '004' // Consolidated e-Invoice
  | '005' // Construction materials (as specified under Fourth Schedule of the Lembaga Pembangunan Industri Pembinaan Malaysia Act 1994)
  | '006' // Disbursement
  | '007' // Donation
  | '008' // e-Commerce - e-Invoice to buyer / purchaser
  | '009' // e-Commerce - Self-billed e-Invoice to seller, logistics, etc.
  | '010' // Education fees
  | '011' // Goods on consignment (Consignor)
  | '012' // Goods on consignment (Consignee)
  | '013' // Gym membership
  | '014' // Insurance - Education and medical benefits
  | '015' // Insurance - Takaful or life insurance
  | '016' // Interest and financing expenses
  | '017' // Internet subscription
  | '018' // Land and building
  | '019' // Medical examination for learning disabilities and early intervention or rehabilitation treatments of learning disabilities
  | '020' // Medical examination or vaccination expenses
  | '021' // Medical expenses for serious diseases
  | '022' // Others
  | '023' // Petroleum operations (as defined in Petroleum (Income Tax) Act 1967)
  | '024' // Private retirement scheme or deferred annuity scheme
  | '025' // Motor vehicle
  | '026' // Subscription of books / journals / magazines / newspapers / other similar publications
  | '027' // Reimbursement
  | '028' // Rental of motor vehicle
  | '029' // EV charging facilities (Installation, rental, sale / purchase or subscription fees)
  | '030' // Repair and maintenance
  | '031' // Research and development
  | '032' // Foreign income
  | '033' // Self-billed - Betting and gaming
  | '034' // Self-billed - Importation of goods
  | '035' // Self-billed - Importation of services
  | '036' // Self-billed - Others
  | '037' // Self-billed - Monetary payment to agents, dealers or distributors
  | '038' // Sports equipment, rental / entry fees for sports facilities, registration in sports competition or sports training fees imposed by associations / sports clubs / companies registered with the Sports Commissioner or Companies Commission of Malaysia and carrying out sports activities as listed under the Sports Development Act 1997
  | '039' // Supporting equipment for disabled person
  | '040' // Voluntary contribution to approved provident fund
  | '041' // Dental examination or treatment
  | '042' // Fertility treatment
  | '043' // Treatment and home care nursing, daycare centres and residential care centers
  | '044' // Vouchers, gift cards, loyalty points, etc
  | '045' // Self-billed - Non-monetary payment to agents, dealers or distributors

/**
 * Enum representing the allowed classification codes with descriptive names.
 * Provides a more readable way to reference classification codes.
 *
 * @example
 * const code = ClassificationCodeEnum.ComputerSmartphoneOrTablet;
 * console.log(code); // Output: "003"
 */
export enum ClassificationCodeEnum {
  BreastfeedingEquipment = '001',
  ChildCareCentresAndKindergartensFees = '002',
  ComputerSmartphoneOrTablet = '003',
  ConsolidatedEInvoice = '004',
  ConstructionMaterials = '005',
  Disbursement = '006',
  Donation = '007',
  ECommerceEInvoiceToBuyer = '008',
  ECommerceSelfBilledToSellerLogistics = '009',
  EducationFees = '010',
  GoodsOnConsignmentConsignor = '011',
  GoodsOnConsignmentConsignee = '012',
  GymMembership = '013',
  InsuranceEducationMedicalBenefits = '014',
  InsuranceTakafulLife = '015',
  InterestFinancingExpenses = '016',
  InternetSubscription = '017',
  LandAndBuilding = '018',
  MedicalExamLearningDisabilities = '019',
  MedicalExamVaccination = '020',
  MedicalExpensesSeriousDiseases = '021',
  Others = '022',
  PetroleumOperations = '023',
  PrivateRetirementSchemeDeferredAnnuity = '024',
  MotorVehicle = '025',
  SubscriptionBooksJournalsEtc = '026',
  Reimbursement = '027',
  RentalOfMotorVehicle = '028',
  EVChargingFacilities = '029',
  RepairAndMaintenance = '030',
  ResearchAndDevelopment = '031',
  ForeignIncome = '032',
  SelfBilledBettingGaming = '033',
  SelfBilledImportationGoods = '034',
  SelfBilledImportationServices = '035',
  SelfBilledOthers = '036',
  SelfBilledMonetaryPaymentToAgents = '037',
  SportsEquipmentRentalFeesEtc = '038',
  SupportingEquipmentDisabledPerson = '039',
  VoluntaryContributionProvidentFund = '040',
  DentalExamTreatment = '041',
  FertilityTreatment = '042',
  TreatmentHomeCareNursingEtc = '043',
  VouchersGiftCardsLoyaltyPoints = '044',
  SelfBilledNonMonetaryPaymentToAgents = '045',
}

/**
 * Interface representing a classification code entry.
 * Contains the code and its corresponding description.
 */
export interface Classification {
  code: ClassificationCode
  description: string
}
