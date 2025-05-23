export type MSICCode = {
  code: string
  description: string
  msicCategoryReference: string
}

export type MSIC_2X_CODE =
  | '20111'
  | '20112'
  | '20113'
  | '20119'
  | '20121'
  | '20129'
  | '20131'
  | '20132'
  | '20133'
  | '20210'
  | '20221'
  | '20222'
  | '20231'
  | '20232'
  | '20291'
  | '20292'
  | '20299'
  | '20300'
  | '21001'
  | '21002'
  | '21003'
  | '21004'
  | '21005'
  | '21006'
  | '21007'
  | '21009'
  | '22111'
  | '22112'
  | '22191'
  | '22192'
  | '22193'
  | '22199'
  | '22201'
  | '22202'
  | '22203'
  | '22204'
  | '22205'
  | '22209'
  | '23101'
  | '23102'
  | '23109'
  | '23911'
  | '23912'
  | '23921'
  | '23929'
  | '23930'
  | '23941'
  | '23942'
  | '23951'
  | '23952'
  | '23953'
  | '23959'
  | '23960'
  | '23990'
  | '24101'
  | '24102'
  | '24103'
  | '24104'
  | '24109'
  | '24201'
  | '24202'
  | '24209'
  | '24311'
  | '24312'
  | '24320'
  | '25111'
  | '25112'
  | '25113'
  | '25119'
  | '25120'
  | '25130'
  | '25200'
  | '25910'
  | '25920'
  | '25930'
  | '25991'
  | '25992'
  | '25993'
  | '25994'
  | '25999'
  | '26101'
  | '26102'
  | '26103'
  | '26104'
  | '26105'
  | '26109'
  | '26201'
  | '26202'
  | '26300'
  | '26400'
  | '26511'
  | '26512'
  | '26520'
  | '26600'
  | '26701'
  | '26702'
  | '26800'
  | '27101'
  | '27102'
  | '27200'
  | '27310'
  | '27320'
  | '27330'
  | '27400'
  | '27500'
  | '27900'
  | '28110'
  | '28120'
  | '28130'
  | '28140'
  | '28150'
  | '28160'
  | '28170'
  | '28180'
  | '28191'
  | '28192'
  | '28199'
  | '28210'
  | '28220'
  | '28230'
  | '28240'
  | '28250'
  | '28260'
  | '28290'
  | '29101'
  | '29102'
  | '29200'
  | '29300'

export enum MSIC_2X {
  MANUFACTURE_OF_INDUSTRIAL_GASES = '20111',
  MANUFACTURE_OF_ORGANIC_CHEMICALS = '20112',
  MANUFACTURE_OF_INORGANIC_COMPOUNDS = '20113',
  MANUFACTURE_OF_OTHER_BASIC_CHEMICALS = '20119',
  MANUFACTURE_OF_FERTILIZERS = '20121',
  MANUFACTURE_OF_NITROGEN_PRODUCTS = '20129',
  MANUFACTURE_OF_PLASTIC_PRIMARY = '20131',
  MANUFACTURE_OF_SYNTHETIC_RUBBER = '20132',
  MANUFACTURE_OF_RUBBER_MIXTURES = '20133',
  MANUFACTURE_OF_PESTICIDES = '20210',
  MANUFACTURE_OF_PAINTS = '20221',
  MANUFACTURE_OF_PRINTING_INK = '20222',
  MANUFACTURE_OF_SOAP = '20231',
  MANUFACTURE_OF_PERFUMES = '20232',
  MANUFACTURE_OF_PHOTOGRAPHIC_PLATES = '20291',
  MANUFACTURE_OF_WRITING_INK = '20292',
  MANUFACTURE_OF_OTHER_CHEMICALS = '20299',
  MANUFACTURE_OF_MANMADE_FIBRES = '20300',
  MANUFACTURE_OF_MEDICINAL_SUBSTANCES = '21001',
  PROCESSING_OF_BLOOD = '21002',
  MANUFACTURE_OF_MEDICAMENTS = '21003',
  MANUFACTURE_OF_CONTRACEPTIVES = '21004',
  MANUFACTURE_OF_DIAGNOSTICS = '21005',
  MANUFACTURE_OF_RADIOACTIVE_SUBSTANCES = '21006',
  MANUFACTURE_OF_BIOTECH_PHARMA = '21007',
  MANUFACTURE_OF_OTHER_PHARMA = '21009',
  MANUFACTURE_OF_RUBBER_TYRES = '22111',
  MANUFACTURE_OF_TYRE_TREADS = '22112',
  MANUFACTURE_OF_RUBBER_PRODUCTS = '22191',
  MANUFACTURE_OF_RUBBER_GLOVES = '22192',
  RUBBER_REMILLING = '22193',
  MANUFACTURE_OF_OTHER_RUBBER = '22199',
  MANUFACTURE_OF_SEMI_PLASTIC = '22201',
  MANUFACTURE_OF_FINISHED_PLASTIC = '22202',
  MANUFACTURE_OF_PLASTIC_PACKAGING = '22203',
  MANUFACTURE_OF_BUILDERS_PLASTIC = '22204',
  MANUFACTURE_OF_PLASTIC_TABLEWARE = '22205',
  MANUFACTURE_OF_OTHER_PLASTIC = '22209',
  MANUFACTURE_OF_FLAT_GLASS = '23101',
  MANUFACTURE_OF_LAB_GLASSWARE = '23102',
  MANUFACTURE_OF_OTHER_GLASS = '23109',
  MANUFACTURE_OF_REFRACTORY_MORTARS = '23911',
  MANUFACTURE_OF_REFRACTORY_CERAMIC = '23912',
  MANUFACTURE_OF_NONREFRACTORY_CERAMIC = '23921',
  MANUFACTURE_OF_CLAY_MATERIALS = '23929',
  MANUFACTURE_OF_PORCELAIN = '23930',
  MANUFACTURE_OF_HYDRAULIC_CEMENT = '23941',
  MANUFACTURE_OF_LIME = '23942',
  MANUFACTURE_OF_CONCRETE = '23951',
  MANUFACTURE_OF_PRECAST_CONCRETE = '23952',
  MANUFACTURE_OF_PREFAB_COMPONENTS = '23953',
  MANUFACTURE_OF_OTHER_CONCRETE = '23959',
  CUTTING_OF_STONE = '23960',
  MANUFACTURE_OF_OTHER_MINERAL = '23990',
  PRODUCTION_OF_PIG_IRON = '24101',
  PRODUCTION_OF_STEEL_BARS = '24102',
  MANUFACTURE_OF_SEAMLESS_TUBES = '24103',
  MANUFACTURE_OF_TUBE_FITTINGS = '24104',
  MANUFACTURE_OF_OTHER_IRON = '24109',
  TIN_SMELTING = '24201',
  PRODUCTION_OF_ALUMINIUM = '24202',
  MANUFACTURE_OF_OTHER_METALS = '24209',
  CASTING_OF_IRON = '24311',
  CASTING_OF_STEEL = '24312',
  CASTING_OF_NONFERROUS = '24320',
  MANUFACTURE_OF_METAL_FRAMEWORKS = '25111',
  MANUFACTURE_OF_PREFAB_BUILDINGS = '25112',
  MANUFACTURE_OF_METAL_DOORS = '25113',
  MANUFACTURE_OF_OTHER_METAL_STRUCTURES = '25119',
  MANUFACTURE_OF_TANKS = '25120',
  MANUFACTURE_OF_STEAM_GENERATORS = '25130',
  MANUFACTURE_OF_WEAPONS = '25200',
  FORGING_OF_METAL = '25910',
  TREATMENT_OF_METALS = '25920',
  MANUFACTURE_OF_CUTLERY = '25930',
  MANUFACTURE_OF_TINS = '25991',
  MANUFACTURE_OF_METAL_CABLE = '25992',
  MANUFACTURE_OF_BOLTS = '25993',
  MANUFACTURE_OF_HOUSEHOLD_METAL = '25994',
  MANUFACTURE_OF_OTHER_METAL = '25999',
  MANUFACTURE_OF_DIODES = '26101',
  MANUFACTURE_OF_INTEGRATED_CIRCUITS = '26102',
  MANUFACTURE_OF_CAPACITORS = '26103',
  MANUFACTURE_OF_CIRCUIT_BOARDS = '26104',
  MANUFACTURE_OF_DISPLAYS = '26105',
  MANUFACTURE_OF_OTHER_ELECTRONICS = '26109',
  MANUFACTURE_OF_COMPUTERS = '26201',
  MANUFACTURE_OF_PERIPHERALS = '26202',
  MANUFACTURE_OF_COMMUNICATION = '26300',
  MANUFACTURE_OF_CONSUMER_ELECTRONICS = '26400',
  MANUFACTURE_OF_MEASURING_EQUIPMENT = '26511',
  MANUFACTURE_OF_CONTROL_EQUIPMENT = '26512',
  MANUFACTURE_OF_WATCHES = '26520',
  MANUFACTURE_OF_MEDICAL_EQUIPMENT = '26600',
  MANUFACTURE_OF_OPTICAL_EQUIPMENT = '26701',
  MANUFACTURE_OF_PHOTO_EQUIPMENT = '26702',
  MANUFACTURE_OF_RECORDING_MEDIA = '26800',
  MANUFACTURE_OF_MOTORS = '27101',
  MANUFACTURE_OF_CONTROL_APPARATUS = '27102',
  MANUFACTURE_OF_BATTERIES = '27200',
  MANUFACTURE_OF_FIBER_OPTICS = '27310',
  MANUFACTURE_OF_WIRES = '27320',
  MANUFACTURE_OF_WIRING_DEVICES = '27330',
  MANUFACTURE_OF_LIGHTING = '27400',
  MANUFACTURE_OF_APPLIANCES = '27500',
  MANUFACTURE_OF_OTHER_ELECTRICAL = '27900',
  MANUFACTURE_OF_ENGINES = '28110',
  MANUFACTURE_OF_FLUID_POWER = '28120',
  MANUFACTURE_OF_PUMPS = '28130',
  MANUFACTURE_OF_BEARINGS = '28140',
  MANUFACTURE_OF_FURNACES = '28150',
  MANUFACTURE_OF_LIFTING_EQUIPMENT = '28160',
  MANUFACTURE_OF_OFFICE_MACHINERY = '28170',
  MANUFACTURE_OF_POWER_TOOLS = '28180',
  MANUFACTURE_OF_REFRIGERATION = '28191',
  MANUFACTURE_OF_AIR_CONDITIONING = '28192',
  MANUFACTURE_OF_OTHER_MACHINERY = '28199',
  MANUFACTURE_OF_AGRICULTURAL_MACHINERY = '28210',
  MANUFACTURE_OF_MACHINE_TOOLS = '28220',
  MANUFACTURE_OF_METALLURGY_MACHINERY = '28230',
  MANUFACTURE_OF_MINING_MACHINERY = '28240',
  MANUFACTURE_OF_FOOD_MACHINERY = '28250',
  MANUFACTURE_OF_TEXTILE_MACHINERY = '28260',
  MANUFACTURE_OF_SPECIAL_MACHINERY = '28290',
  MANUFACTURE_OF_CARS = '29101',
  MANUFACTURE_OF_COMMERCIAL_VEHICLES = '29102',
  MANUFACTURE_OF_VEHICLE_BODIES = '29200',
  MANUFACTURE_OF_VEHICLE_PARTS = '29300',
}
