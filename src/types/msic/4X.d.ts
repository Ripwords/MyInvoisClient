export type MSIC_4X_CODE =
  | '41001'
  | '41002'
  | '41003'
  | '41009'
  | '42101'
  | '42102'
  | '42103'
  | '42104'
  | '42105'
  | '42106'
  | '42109'
  | '42201'
  | '42202'
  | '42203'
  | '42204'
  | '42205'
  | '42206'
  | '42207'
  | '42209'
  | '42901'
  | '42902'
  | '42903'
  | '42904'
  | '42905'
  | '42906'
  | '42909'
  | '43110'
  | '43121'
  | '43122'
  | '43123'
  | '43124'
  | '43125'
  | '43126'
  | '43129'
  | '43211'
  | '43212'
  | '43213'
  | '43214'
  | '43215'
  | '43216'
  | '43219'
  | '43221'
  | '43222'
  | '43223'
  | '43224'
  | '43225'
  | '43226'
  | '43227'
  | '43228'
  | '43229'
  | '43291'
  | '43292'
  | '43293'
  | '43294'
  | '43295'
  | '43299'
  | '43301'
  | '43302'
  | '43303'
  | '43304'
  | '43305'
  | '43306'
  | '43307'
  | '43309'
  | '43901'
  | '43902'
  | '43903'
  | '43904'
  | '43905'
  | '43906'
  | '43907'
  | '43909'
  | '45101'
  | '45102'
  | '45103'
  | '45104'
  | '45105'
  | '45106'
  | '45109'
  | '45201'
  | '45202'
  | '45203'
  | '45204'
  | '45205'
  | '45300'
  | '45401'
  | '45402'
  | '45403'
  | '46100'
  | '46201'
  | '46202'
  | '46203'
  | '46204'
  | '46205'
  | '46209'
  | '46311'
  | '46312'
  | '46313'
  | '46314'
  | '46319'
  | '46321'
  | '46322'
  | '46323'
  | '46324'
  | '46325'
  | '46326'
  | '46327'
  | '46329'
  | '46411'
  | '46412'
  | '46413'
  | '46414'
  | '46415'
  | '46416'
  | '46417'
  | '46419'
  | '46421'
  | '46422'
  | '46431'
  | '46432'
  | '46433'
  | '46434'
  | '46441'
  | '46442'
  | '46443'
  | '46444'
  | '46491'
  | '46492'
  | '46493'
  | '46494'
  | '46495'
  | '46496'
  | '46497'
  | '46499'
  | '46510'
  | '46521'
  | '46522'
  | '46531'
  | '46532'
  | '46591'
  | '46592'
  | '46593'
  | '46594'
  | '46595'
  | '46596'
  | '46599'
  | '46611'
  | '46612'
  | '46619'
  | '46621'
  | '46622'
  | '46631'
  | '46632'
  | '46633'
  | '46634'
  | '46635'
  | '46636'
  | '46637'
  | '46639'
  | '46691'
  | '46692'
  | '46693'
  | '46694'
  | '46695'
  | '46696'
  | '46697'
  | '46698'
  | '46699'
  | '46901'
  | '46902'
  | '46909'
  | '47111'
  | '47112'
  | '47113'
  | '47114'
  | '47191'
  | '47192'
  | '47193'
  | '47194'
  | '47199'
  | '47211'
  | '47212'
  | '47213'
  | '47214'
  | '47215'
  | '47216'
  | '47217'
  | '47219'
  | '47221'
  | '47222'
  | '47230'
  | '47300'
  | '47412'
  | '47413'
  | '47420'
  | '47510'
  | '47531'
  | '47532'
  | '47533'
  | '47591'
  | '47592'
  | '47593'
  | '47594'
  | '47595'
  | '47596'
  | '47597'
  | '47598'
  | '47611'
  | '47612'
  | '47631'
  | '47632'
  | '47633'
  | '47634'
  | '47635'
  | '47640'
  | '47711'
  | '47712'
  | '47713'
  | '47721'
  | '47722'
  | '47731'
  | '47732'
  | '47733'
  | '47734'
  | '47735'
  | '47736'
  | '47737'
  | '47738'
  | '47739'
  | '47741'
  | '47742'
  | '47743'
  | '47744'
  | '47749'
  | '47810'
  | '47820'
  | '47891'
  | '47893'
  | '47894'
  | '47895'
  | '47911'
  | '47912'
  | '47913'
  | '47914'
  | '47992'
  | '47999'
  | '49110'
  | '49120'
  | '49211'
  | '49212'
  | '49221'
  | '49222'
  | '49223'
  | '49224'
  | '49225'
  | '49229'
  | '49230'
  | '49300'

export enum MSIC_4X {
  RESIDENTIAL_BUILDINGS = '41001',
  NON_RESIDENTIAL_BUILDINGS = '41002',
  PREFAB_CONSTRUCTION = '41003',
  CONSTRUCTION_OF_BUILDINGS = '41009',
  CONSTRUCTION_OF_ROADS = '42101',
  SURFACE_WORK = '42102',
  CONSTRUCTION_OF_BRIDGES = '42103',
  CONSTRUCTION_OF_TUNNELS = '42104',
  CONSTRUCTION_OF_RAILWAYS = '42105',
  CONSTRUCTION_OF_RUNWAYS = '42106',
  CONSTRUCTION_OF_ROADS_OTHER = '42109',
  LONG_DISTANCE_PIPELINES = '42201',
  URBAN_PIPELINES = '42202',
  WATER_MAIN_CONSTRUCTION = '42203',
  RESERVOIRS = '42204',
  IRRIGATION_SYSTEMS = '42205',
  SEWER_SYSTEMS = '42206',
  POWER_PLANTS = '42207',
  UTILITY_PROJECTS = '42209',
  CONSTRUCTION_OF_REFINERIES = '42901',
  CONSTRUCTION_OF_WATERWAYS = '42902',
  CONSTRUCTION_OF_DAMS = '42903',
  DREDGING_OF_WATERWAYS = '42904',
  OUTDOOR_SPORTS_FACILITIES = '42905',
  LAND_SUBDIVISION = '42906',
  CONSTRUCTION_OTHER = '42909',
  DEMOLITION = '43110',
  SITE_CLEARING = '43121',
  EARTH_MOVING = '43122',
  SITE_DRILLING = '43123',
  MINING_SITE_PREPARATION = '43124',
  DRAINAGE_OF_LAND = '43125',
  LAND_RECLAMATION = '43126',
  SITE_PREPARATION_OTHER = '43129',
  ELECTRICAL_WIRING = '43211',
  TELECOMMUNICATIONS_WIRING = '43212',
  COMPUTER_NETWORK_WIRING = '43213',
  SATELLITE_DISHES = '43214',
  LIGHTING_SYSTEMS = '43215',
  SECURITY_SYSTEMS = '43216',
  ELECTRICAL_INSTALLATION_OTHER = '43219',
  HEATING_SYSTEMS = '43221',
  FURNACE_INSTALLATION = '43222',
  SOLAR_ENERGY_COLLECTORS = '43223',
  PLUMBING_INSTALLATION = '43224',
  AIR_CONDITIONING = '43225',
  GAS_FITTING = '43226',
  SPRINKLER_SYSTEMS = '43227',
  STEAM_PIPING = '43228',
  PLUMBING_OTHER = '43229',
  ELEVATOR_INSTALLATION = '43291',
  AUTOMATED_DOORS = '43292',
  LIGHTNING_CONDUCTORS = '43293',
  VACUUM_CLEANING = '43294',
  THERMAL_INSULATION = '43295',
  INSTALLATION_OTHER = '43299',
  JOINERY_INSTALLATION = '43301',
  FLOOR_WALL_COVERING = '43302',
  INTERIOR_PAINTING = '43303',
  EXTERIOR_PAINTING = '43304',
  GLASS_INSTALLATION = '43305',
  INTERIOR_COMPLETION = '43306',
  BUILDING_CLEANING = '43307',
  BUILDING_COMPLETION_OTHER = '43309',
  FOUNDATION_WORK = '43901',
  STEEL_ELEMENTS = '43902',
  SCAFFOLDING = '43903',
  BRICKLAYING = '43904',
  SWIMMING_POOLS = '43905',
  STEAM_CLEANING = '43906',
  CONSTRUCTION_EQUIPMENT_RENTAL = '43907',
  CONSTRUCTION_SPECIALIZED_OTHER = '43909',
  NEW_MOTOR_VEHICLES = '45101',
  USED_MOTOR_VEHICLES = '45102',
  NEW_COMMERCIAL_VEHICLES = '45103',
  USED_COMMERCIAL_VEHICLES = '45104',
  COMMISSION_AGENTS = '45105',
  CAR_AUCTIONS = '45106',
  VEHICLE_SALES_OTHER = '45109',
  VEHICLE_MAINTENANCE = '45201',
  VEHICLE_PAINTING = '45202',
  CAR_WASH = '45203',
  SEAT_REPAIR = '45204',
  PARTS_INSTALLATION = '45205',
  VEHICLE_PARTS = '45300',
  MOTORCYCLE_SALES = '45401',
  MOTORCYCLE_PARTS = '45402',
  MOTORCYCLE_REPAIR = '45403',
  WHOLESALE_ON_CONTRACT = '46100',
  WHOLESALE_OF_RUBBER = '46201',
  WHOLESALE_OF_PALM_OIL = '46202',
  WHOLESALE_OF_TIMBER = '46203',
  WHOLESALE_OF_FLOWERS = '46204',
  WHOLESALE_OF_LIVESTOCK = '46205',
  WHOLESALE_OF_AGRICULTURAL = '46209',
  WHOLESALE_OF_MEAT = '46311',
  WHOLESALE_OF_SEAFOOD = '46312',
  WHOLESALE_OF_FRUITS = '46313',
  WHOLESALE_OF_VEGETABLES = '46314',
  WHOLESALE_OF_FOOD = '46319',
  WHOLESALE_OF_RICE = '46321',
  WHOLESALE_OF_DAIRY = '46322',
  WHOLESALE_OF_CONFECTIONERY = '46323',
  WHOLESALE_OF_BAKERY = '46324',
  WHOLESALE_OF_BEVERAGES = '46325',
  WHOLESALE_OF_ALCOHOL = '46326',
  WHOLESALE_OF_TOBACCO = '46327',
  WHOLESALE_OF_FOODSTUFF = '46329',
  WHOLESALE_OF_TEXTILES = '46411',
  WHOLESALE_OF_LINEN = '46412',
  WHOLESALE_OF_CLOTHING = '46413',
  WHOLESALE_OF_ACCESSORIES = '46414',
  WHOLESALE_OF_FUR = '46415',
  WHOLESALE_OF_FOOTWEAR = '46416',
  WHOLESALE_OF_HABERDASHERY = '46417',
  WHOLESALE_OF_TEXTILES_OTHER = '46419',
  WHOLESALE_OF_PHARMACEUTICALS = '46421',
  WHOLESALE_OF_COSMETICS = '46422',
  WHOLESALE_OF_BICYCLES = '46431',
  WHOLESALE_OF_PHOTO_EQUIPMENT = '46432',
  WHOLESALE_OF_LEATHER = '46433',
  WHOLESALE_OF_SPORTS = '46434',
  WHOLESALE_OF_HANDICRAFTS = '46441',
  WHOLESALE_OF_CUT_FLOWERS = '46442',
  WHOLESALE_OF_WATCHES = '46443',
  WHOLESALE_OF_JEWELLERY = '46444',
  WHOLESALE_OF_FURNITURE = '46491',
  WHOLESALE_OF_APPLIANCES = '46492',
  WHOLESALE_OF_LIGHTING = '46493',
  WHOLESALE_OF_UTENSILS = '46494',
  WHOLESALE_OF_WOODENWARE = '46495',
  WHOLESALE_OF_ELECTRONICS = '46496',
  WHOLESALE_OF_STATIONERY = '46497',
  WHOLESALE_OF_HOUSEHOLD = '46499',
  WHOLESALE_OF_COMPUTERS = '46510',
  WHOLESALE_OF_PHONES = '46521',
  WHOLESALE_OF_COMPONENTS = '46522',
  WHOLESALE_OF_AGRICULTURAL_MACHINERY = '46531',
  WHOLESALE_OF_LAWN_MOWERS = '46532',
  WHOLESALE_OF_OFFICE_MACHINERY = '46591',
  WHOLESALE_OF_OFFICE_FURNITURE = '46592',
  WHOLESALE_OF_MACHINE_TOOLS = '46593',
  WHOLESALE_OF_INDUSTRIAL_MACHINERY = '46594',
  WHOLESALE_OF_CONSTRUCTION_MACHINERY = '46595',
  WHOLESALE_OF_LIFTS = '46596',
  WHOLESALE_OF_MACHINERY_OTHER = '46599',
  WHOLESALE_OF_PETROL = '46611',
  WHOLESALE_OF_LPG = '46612',
  WHOLESALE_OF_FUELS = '46619',
  WHOLESALE_OF_METAL_ORES = '46621',
  WHOLESALE_OF_METAL_PRODUCTS = '46622',
  WHOLESALE_OF_LOGS = '46631',
  WHOLESALE_OF_PAINTS = '46632',
  WHOLESALE_OF_CONSTRUCTION_MATERIALS = '46633',
  WHOLESALE_OF_FITTINGS = '46634',
  WHOLESALE_OF_WATER_HEATERS = '46635',
  WHOLESALE_OF_SANITARY = '46636',
  WHOLESALE_OF_TOOLS = '46637',
  WHOLESALE_OF_HARDWARE = '46639',
  WHOLESALE_OF_CHEMICALS = '46691',
  WHOLESALE_OF_FERTILIZERS = '46692',
  WHOLESALE_OF_PLASTICS = '46693',
  WHOLESALE_OF_RUBBER_SCRAP = '46694',
  WHOLESALE_OF_TEXTILE_FIBRES = '46695',
  WHOLESALE_OF_PAPER = '46696',
  WHOLESALE_OF_PRECIOUS_STONES = '46697',
  WHOLESALE_OF_SCRAP = '46698',
  WHOLESALE_OF_PARTS = '46699',
  WHOLESALE_OF_PETS = '46901',
  WHOLESALE_OF_PET_FOOD = '46902',
  WHOLESALE_GENERAL = '46909',
  PROVISION_STORES = '47111',
  SUPERMARKET = '47112',
  MINI_MARKET = '47113',
  CONVENIENCE_STORES = '47114',
  DEPARTMENT_STORES = '47191',
  DEPARTMENT_AND_SUPER = '47192',
  HYPERMARKET = '47193',
  NEWS_AGENT = '47194',
  RETAIL_NONSPECIALIZED = '47199',
  RETAIL_OF_RICE = '47211',
  RETAIL_OF_VEGETABLES = '47212',
  RETAIL_OF_DAIRY = '47213',
  RETAIL_OF_MEAT = '47214',
  RETAIL_OF_SEAFOOD = '47215',
  RETAIL_OF_BAKERY = '47216',
  RETAIL_OF_NOODLES = '47217',
  RETAIL_OF_FOOD = '47219',
  RETAIL_OF_ALCOHOL = '47221',
  RETAIL_OF_BEVERAGES = '47222',
  RETAIL_OF_TOBACCO = '47230',
  RETAIL_OF_FUEL = '47300',
  RETAIL_OF_GAMES = '47412',
  RETAIL_OF_PHONES = '47413',
  RETAIL_OF_AUDIO = '47420',
  RETAIL_OF_TEXTILES = '47510',
  RETAIL_OF_CARPETS = '47531',
  RETAIL_OF_CURTAINS = '47532',
  RETAIL_OF_WALLPAPER = '47533',
  RETAIL_OF_FURNITURE = '47591',
  RETAIL_OF_LIGHTING = '47592',
  RETAIL_OF_UTENSILS = '47593',
  RETAIL_OF_WOODENWARE = '47594',
  RETAIL_OF_APPLIANCES = '47595',
  RETAIL_OF_MUSICAL = '47596',
  RETAIL_OF_SECURITY = '47597',
  RETAIL_OF_HOUSEHOLD = '47598',
  RETAIL_OF_OFFICE = '47611',
  RETAIL_OF_BOOKS = '47612',
  RETAIL_OF_SPORTS = '47631',
  RETAIL_OF_FISHING = '47632',
  RETAIL_OF_CAMPING = '47633',
  RETAIL_OF_BOATS = '47634',
  RETAIL_OF_BICYCLES = '47635',
  RETAIL_OF_TOYS = '47640',
  RETAIL_OF_CLOTHING = '47711',
  RETAIL_OF_FOOTWEAR = '47712',
  RETAIL_OF_LEATHER = '47713',
  RETAIL_OF_PHARMACEUTICALS = '47721',
  RETAIL_OF_COSMETICS = '47722',
  RETAIL_OF_PHOTO = '47731',
  RETAIL_OF_WATCHES = '47732',
  RETAIL_OF_JEWELLERY = '47733',
  RETAIL_OF_FLOWERS = '47734',
  RETAIL_OF_SOUVENIRS = '47735',
  RETAIL_OF_FUEL_OIL = '47736',
  RETAIL_OF_OPTICAL = '47737',
  RETAIL_OF_PETS = '47738',
  RETAIL_SPECIALIZED = '47739',
  RETAIL_OF_USED_BOOKS = '47741',
  RETAIL_OF_USED_ELECTRONICS = '47742',
  RETAIL_OF_ANTIQUES = '47743',
  RETAIL_AUCTIONS = '47744',
  RETAIL_OF_USED = '47749',
  RETAIL_FOOD_STALLS = '47810',
  RETAIL_CLOTHING_STALLS = '47820',
  RETAIL_CARPET_STALLS = '47891',
  RETAIL_TOY_STALLS = '47893',
  RETAIL_ELECTRONICS_STALLS = '47894',
  RETAIL_MUSIC_STALLS = '47895',
  RETAIL_MAIL_ORDER = '47911',
  RETAIL_INTERNET = '47912',
  RETAIL_TV = '47913',
  RETAIL_INTERNET_AUCTIONS = '47914',
  RETAIL_VENDING = '47992',
  RETAIL_OTHER = '47999',
  PASSENGER_RAIL = '49110',
  FREIGHT_RAIL = '49120',
  CITY_BUS = '49211',
  URBAN_RAIL = '49212',
  EXPRESS_BUS = '49221',
  EMPLOYEE_BUS = '49222',
  SCHOOL_BUS = '49223',
  TAXI_SERVICES = '49224',
  CAR_RENTAL_WITH_DRIVER = '49225',
  PASSENGER_TRANSPORT_OTHER = '49229',
  FREIGHT_TRANSPORT = '49230',
  PIPELINE_TRANSPORT = '49300',
}
