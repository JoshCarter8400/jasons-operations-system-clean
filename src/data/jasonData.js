// Jason's Real Business Data - Complete Client Database
export const jasonBusinessData = {
  businessInfo: {
    name: "Trusting and Affordable Tree Service and Lawn Care",
    phone: "516-580-1223",
    email: "Jasonmccorry@yahoo.com",
    serviceAreas: ["Sarasota", "Bradenton", "Nokomis", "Osprey", "North Venice"],
    taxRate: 0.075 // Florida sales tax 7.5%
  },

  services: [
    { name: "Weekly Mowing", priceRange: "$35-$75", defaultRate: 50.00 },
    { name: "Bi-weekly Mowing", priceRange: "$35-$75", defaultRate: 45.00 },
    { name: "Hedge Trimming", priceRange: "$125-$750", defaultRate: 200.00 },
    { name: "Tree Trimming", priceRange: "$250-$2500", defaultRate: 500.00 },
    { name: "Weed Control", priceRange: "$25-$75", defaultRate: 50.00 },
    { name: "Pressure Washing", priceRange: "$150-$1000", defaultRate: 300.00 },
    { name: "Mulch Application", priceRange: "$125-$1000", defaultRate: 250.00 },
    { name: "Landscape Reconstruction", priceRange: "$500-$5000", defaultRate: 1500.00 },
    { name: "Deep Root Fertilization", priceRange: "$125-$200", defaultRate: 150.00 },
    { name: "Gutter Cleaning", priceRange: "$125-$250", defaultRate: 175.00 }
  ],

  paymentMethods: ["Cash", "Check", "Venmo", "Zelle", "Cash App", "Credit Card", "Email Invoice"],

  clients: [
    {
      id: 1,
      name: "Irina Realtor",
      address: "12665 Promenade Estates Blvd, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (360) 907-0121",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi-weekly grass",
      price: "$40/per cut",
      paymentMethod: "Cash App",
      notes: "cash app",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-11",
      createdDate: "2024-01-15",
      totalInvoiced: 320.00,
      totalPaid: 280.00
    },
    {
      id: 2,
      name: "Emily and Jason Kulchar",
      address: "5690 Equator Ct, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (908) 295-3578",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "Bi-weekly Grass",
      price: "$55/per cut",
      paymentMethod: "Venmo",
      notes: "monthly weed killer included Venmo",
      status: "Active",
      lastService: "2024-07-25",
      nextService: "2024-08-08",
      createdDate: "2024-02-01",
      totalInvoiced: 660.00,
      totalPaid: 660.00
    },
    {
      id: 3,
      name: "Mike",
      address: "15157 Shady Palms Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "(253) 298-1860",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$35/per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-30",
      nextService: "2024-08-13",
      createdDate: "2024-01-20",
      totalInvoiced: 420.00,
      totalPaid: 385.00
    },
    {
      id: 4,
      name: "Christian and Mary",
      address: "15153 Shady Palms Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (941) 413-9817",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$250/monthly",
      paymentMethod: "Zelle",
      notes: "bi weekly grass/hedge trimming/weed killer included Zelle",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-11",
      createdDate: "2024-03-01",
      totalInvoiced: 1250.00,
      totalPaid: 1000.00
    },
    {
      id: 5,
      name: "Ericka and Eugene",
      address: "15333 Isla Palma Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (650) 766-9165",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$40/per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-26",
      nextService: "2024-08-09",
      createdDate: "2024-02-15",
      totalInvoiced: 480.00,
      totalPaid: 440.00
    },
    {
      id: 6,
      name: "Jane",
      address: "5628 Blue Reef Pl, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (415) 748-0214",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass Monthly hedge trimming / weed killer maintenance",
      price: "$125/month",
      paymentMethod: "Check",
      notes: "check/cash",
      status: "Active",
      lastService: "2024-07-29",
      nextService: "2024-08-12",
      createdDate: "2024-01-10",
      totalInvoiced: 875.00,
      totalPaid: 750.00
    },
    {
      id: 7,
      name: "Jordan",
      address: "15081 Shady Palms Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (941) 586-6567",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$50/per cut",
      paymentMethod: "Venmo",
      notes: "Venmo",
      status: "Active",
      lastService: "2024-07-27",
      nextService: "2024-08-10",
      createdDate: "2024-01-25",
      totalInvoiced: 600.00,
      totalPaid: 550.00
    },
    {
      id: 8,
      name: "Ilona grass",
      address: "15348 Isla Palma Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (415) 305-7070",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$35/per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-31",
      nextService: "2024-08-14",
      createdDate: "2024-02-10",
      totalInvoiced: 420.00,
      totalPaid: 385.00
    },
    {
      id: 9,
      name: "Mela",
      address: "15357 Isla Palma Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (941) 468-9096",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$40/per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-26",
      nextService: "2024-08-09",
      createdDate: "2024-03-05",
      totalInvoiced: 320.00,
      totalPaid: 280.00
    },
    {
      id: 10,
      name: "Issac",
      address: "108 Runaway Field Ave, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (470) 370-2824",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$45 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-11",
      createdDate: "2024-02-20",
      totalInvoiced: 450.00,
      totalPaid: 405.00
    },
    {
      id: 11,
      name: "Jason",
      address: "Whiteland Bend, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (949) 235-1051",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass Monthly weed killer included",
      price: "$50 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-29",
      nextService: "2024-08-12",
      createdDate: "2024-01-12",
      totalInvoiced: 600.00,
      totalPaid: 550.00
    },
    {
      id: 12,
      name: "Kathie Gorden",
      address: "Whiteland Bend, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (561) 350-6953",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$40 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-30",
      nextService: "2024-08-13",
      createdDate: "2024-01-30",
      totalInvoiced: 480.00,
      totalPaid: 440.00
    },
    {
      id: 13,
      name: "Julie",
      address: "925 Garland Ave, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (941) 234-7201",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass /water plants monthly weed killer",
      price: "$425 monthly",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-31",
      nextService: "2024-08-07",
      createdDate: "2024-01-05",
      totalInvoiced: 2975.00,
      totalPaid: 2550.00
    },
    {
      id: 14,
      name: "Shay",
      address: "106 Pops Ln, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (207) 233-8534",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$45 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-27",
      nextService: "2024-08-10",
      createdDate: "2024-02-25",
      totalInvoiced: 450.00,
      totalPaid: 405.00
    },
    {
      id: 15,
      name: "Kelly",
      address: "648 Capistrano Dr, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (941) 586-5784",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$160 monthly",
      paymentMethod: "Venmo",
      notes: "Venmo",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-18",
      totalInvoiced: 1120.00,
      totalPaid: 960.00
    },
    {
      id: 16,
      name: "Ann",
      address: "2200 Lake Shore Dr, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (570) 847-0946",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$40 per cut",
      paymentMethod: "Check",
      notes: "sends check",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-22",
      totalInvoiced: 1120.00,
      totalPaid: 1000.00
    },
    {
      id: 17,
      name: "Nikie",
      address: "423 S Creek Dr, Osprey, FL, United States",
      area: "Osprey",
      phone: "+1 (941) 468-9551",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass Monthly weed killer Quarterly hedge Trimming",
      price: "$225 monthly",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-08",
      totalInvoiced: 1575.00,
      totalPaid: 1350.00
    },
    {
      id: 18,
      name: "Erin",
      address: "1915 Colleen St, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (941) 928-5409",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$40 per cut",
      paymentMethod: "Zelle",
      notes: "weed killer application as needed $40",
      status: "Active",
      lastService: "2024-07-29",
      nextService: "2024-08-12",
      createdDate: "2024-02-12",
      totalInvoiced: 480.00,
      totalPaid: 440.00
    },
    {
      id: 19,
      name: "Celeste",
      address: "6308 Pauline Ave, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (443) 465-6076",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$40 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-30",
      nextService: "2024-08-13",
      createdDate: "2024-03-10",
      totalInvoiced: 320.00,
      totalPaid: 280.00
    },
    {
      id: 20,
      name: "Jessa",
      address: "5357 Castleman Dr, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (352) 213-0313",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$37.50 per cut",
      paymentMethod: "Zelle",
      notes: "confirm day before time / has dog",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-15",
      totalInvoiced: 1050.00,
      totalPaid: 900.00
    },
    {
      id: 21,
      name: "Suzanne",
      address: "5407 Bent Oak Dr, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (650) 547-8012",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$150 monthly",
      paymentMethod: "Check",
      notes: "Check",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-20",
      totalInvoiced: 1050.00,
      totalPaid: 900.00
    },
    {
      id: 22,
      name: "Kaitlin",
      address: "2342 Teal Ave, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (703) 727-6645",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$37.50 per cut",
      paymentMethod: "Venmo",
      notes: "Venmo",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-02-05",
      totalInvoiced: 900.00,
      totalPaid: 750.00
    },
    {
      id: 23,
      name: "Sam",
      address: "4440 Deer Ridge Pl, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (863) 295-1288",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$40 per cut",
      paymentMethod: "Check",
      notes: "sends check in mail",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-28",
      totalInvoiced: 1120.00,
      totalPaid: 1000.00
    },
    {
      id: 24,
      name: "Daniel Tinker",
      address: "4801 Sarasota Ave, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (415) 509-3439",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$75",
      paymentMethod: "Venmo",
      notes: "Venmo",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-11",
      createdDate: "2024-02-18",
      totalInvoiced: 750.00,
      totalPaid: 675.00
    },
    {
      id: 25,
      name: "Maria",
      address: "400 N Washington Dr, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (301) 728-7144",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass/weed killer included monthly",
      price: "$250 monthly",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-12",
      totalInvoiced: 1750.00,
      totalPaid: 1500.00
    },
    {
      id: 26,
      name: "Saly",
      address: "3594 27th Pkwy, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (941) 356-5285",
      email: "",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass / weed killer included",
      price: "$150",
      paymentMethod: "Cash App",
      notes: "cash app",
      status: "Active",
      lastService: "2024-07-29",
      nextService: "2024-08-12",
      createdDate: "2024-03-01",
      totalInvoiced: 750.00,
      totalPaid: 600.00
    },
    {
      id: 27,
      name: "Seascape Properties (Hannah)",
      address: "2701 Robinson Ave, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (615) 609-0443",
      email: "sunscapepropertyservices@gmail.com",
      serviceType: "Bi-weekly Mowing",
      services: "bi weekly grass",
      price: "$35 per cut",
      paymentMethod: "Email Invoice",
      notes: "Email invoice to sunscapepropertyservices@gmail.com",
      status: "Active",
      lastService: "2024-07-30",
      nextService: "2024-08-13",
      createdDate: "2024-02-08",
      totalInvoiced: 420.00,
      totalPaid: 350.00
    },
    {
      id: 28,
      name: "Ilona",
      address: "2178 Wood Hollow Way, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (415) 305-7070",
      email: "",
      serviceType: "Weekly Mowing",
      services: "weekly grass",
      price: "$35",
      paymentMethod: "Zelle",
      notes: "Zelle both properties (15348 Isla Palma Ln Nokomis, FL, United States)",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-25",
      totalInvoiced: 980.00,
      totalPaid: 840.00
    },
    {
      id: 29,
      name: "Keely",
      address: "4303 Murdock Ave, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "941-350-8690",
      email: "",
      serviceType: "Weed Control",
      services: "weed eat property",
      price: "$45 per cut",
      paymentMethod: "Zelle",
      notes: "Zelle",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-11",
      createdDate: "2024-03-15",
      totalInvoiced: 360.00,
      totalPaid: 315.00
    },
    {
      id: 30,
      name: "Tommy Bahama (Wendy)",
      address: "6562 University Parkway, Lakewood Ranch, FL",
      area: "Bradenton",
      phone: "Wendy +1 (682) 380-2366",
      email: "lakewoodranchmarlinbar@invoice.plateiq.com",
      serviceType: "Weekly Mowing",
      services: "weekly Water Palms maintenance",
      price: "$125 monthly",
      paymentMethod: "Email Invoice",
      notes: "email invoice monthly lakewoodranchmarlinbar@invoice.plateiq.com",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-10",
      totalInvoiced: 875.00,
      totalPaid: 750.00
    },
    {
      id: 31,
      name: "Cheesecake Factory Flower Child",
      address: "6532 University Parkway Lakewood Ranch Fl 34240",
      area: "Bradenton",
      phone: "Denise Hall (714) 305-6742",
      email: "dgutierrez@foxrc.com",
      serviceType: "Weekly Mowing",
      services: "weekly watering maintenance",
      price: "$225 monthly",
      paymentMethod: "Email Invoice",
      notes: "email invoice to Dom dgutierrez@foxrc.com",
      status: "Active",
      lastService: "2024-08-01",
      nextService: "2024-08-08",
      createdDate: "2024-01-15",
      totalInvoiced: 1575.00,
      totalPaid: 1350.00
    },
    {
      id: 32,
      name: "Seaglass Management",
      address: "Multiple Properties",
      area: "Sarasota",
      phone: "+1 (717) 320-3180",
      email: "seaglassmanagement@gmail.com",
      serviceType: "Bi-weekly Mowing",
      services: "Air BnB company grass maintenance",
      price: "Various ($100-$250)",
      paymentMethod: "Email Invoice",
      notes: "email Invoice to seaglassmanagement@gmail.com - Multiple properties: 1776 Rita St $140, 1716 Mova St $140, 2135 Lee Ln $165, 946 Charlotte Ave $165, 1150 Charlotte Ave $250, 2962 Floyd St $165, 2959 Sequoia Ln $165, 1021 S Allendale Av $125, 4414 Denice Ln $175, 659 Ohio st $100",
      status: "Active",
      lastService: "2024-07-30",
      nextService: "2024-08-13",
      createdDate: "2024-02-01",
      totalInvoiced: 9100.00,
      totalPaid: 8200.00
    },
    {
      id: 33,
      name: "Tom and Ricky",
      address: "6243 Talon Preserve Dr, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "Ricky 239-682-6532, Tom+1 (239) 641-7695",
      email: "",
      serviceType: "Hedge Trimming",
      services: "monthly hedge trimming / deep root fertilizer every other month",
      price: "$150",
      paymentMethod: "Check",
      notes: "call day before",
      status: "Active",
      lastService: "2024-07-25",
      nextService: "2024-08-25",
      createdDate: "2024-01-08",
      totalInvoiced: 1050.00,
      totalPaid: 900.00
    },
    {
      id: 34,
      name: "Cathy Thompson",
      address: "5969 Talon Preserve Dr, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (571) 455-0238",
      email: "",
      serviceType: "Hedge Trimming",
      services: "quarterly weed killer maintenance /hedge-palm trimming/ edging flower beds",
      price: "$175 quarterly",
      paymentMethod: "Check",
      notes: "Check - Refresh mulch priced at time of service",
      status: "Active",
      lastService: "2024-06-15",
      nextService: "2024-09-15",
      createdDate: "2024-03-01",
      totalInvoiced: 525.00,
      totalPaid: 350.00
    },
    {
      id: 35,
      name: "Vince",
      address: "14462 Little Eagle Loop, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "(919) 798-0510",
      email: "",
      serviceType: "Deep Root Fertilization",
      services: "Fertilizer and weed control",
      price: "$150 monthly",
      paymentMethod: "Check",
      notes: "Check",
      status: "Active",
      lastService: "2024-07-20",
      nextService: "2024-08-20",
      createdDate: "2024-02-10",
      totalInvoiced: 900.00,
      totalPaid: 750.00
    },
    {
      id: 36,
      name: "Ronald",
      address: "14675 Hidden Sawgrass Path, Nokomis, FL, United States",
      area: "Nokomis",
      phone: "+1 (201) 675-3977",
      email: "",
      serviceType: "Hedge Trimming",
      services: "weed control/ hedge trimming / fertilizer",
      price: "$175 monthly",
      paymentMethod: "Check",
      notes: "Check",
      status: "Active",
      lastService: "2024-07-22",
      nextService: "2024-08-22",
      createdDate: "2024-01-18",
      totalInvoiced: 1225.00,
      totalPaid: 1050.00
    },
    {
      id: 37,
      name: "Melvin",
      address: "5428 Lago Maggio St, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (847) 708-6567",
      email: "",
      serviceType: "Hedge Trimming",
      services: "monthly trimming/ fertilizer / hedge trimming",
      price: "$150 monthly",
      paymentMethod: "Check",
      notes: "check",
      status: "Active",
      lastService: "2024-07-25",
      nextService: "2024-08-25",
      createdDate: "2024-02-05",
      totalInvoiced: 900.00,
      totalPaid: 750.00
    },
    {
      id: 38,
      name: "Carla",
      address: "5341 Trails Bend Ct, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (517) 290-4829",
      email: "",
      serviceType: "Hedge Trimming",
      services: "monthly hedge trimming / weed control/ palm trimming",
      price: "$125 monthly",
      paymentMethod: "Venmo",
      notes: "Venmo",
      status: "Active",
      lastService: "2024-07-28",
      nextService: "2024-08-28",
      createdDate: "2024-01-30",
      totalInvoiced: 875.00,
      totalPaid: 750.00
    },
    {
      id: 39,
      name: "Cindy",
      address: "6100 talon preserve Sarasota FL",
      area: "Sarasota",
      phone: "+1 (609) 220-9642",
      email: "",
      serviceType: "Hedge Trimming",
      services: "monthly hedge trimming / weed control / Fertilizer",
      price: "$150",
      paymentMethod: "Check",
      notes: "check",
      status: "Active",
      lastService: "2024-07-26",
      nextService: "2024-08-26",
      createdDate: "2024-03-12",
      totalInvoiced: 750.00,
      totalPaid: 600.00
    },
    {
      id: 40,
      name: "Betty Jo",
      address: "12451 Marsh Pointe Rd, Sarasota, FL, United States",
      area: "Sarasota",
      phone: "+1 (941) 400-1387",
      email: "",
      serviceType: "Hedge Trimming",
      services: "monthly hedge trimming/ palm trimming / weed control/ hedge trimming",
      price: "$250",
      paymentMethod: "Check",
      notes: "check",
      status: "Active",
      lastService: "2024-07-24",
      nextService: "2024-08-24",
      createdDate: "2024-01-05",
      totalInvoiced: 1750.00,
      totalPaid: 1500.00
    }
  ]
};

// Extracted data for easy access
export const businessInfo = jasonBusinessData.businessInfo;
export const services = jasonBusinessData.services;
export const serviceAreas = jasonBusinessData.businessInfo.serviceAreas;
export const paymentMethods = jasonBusinessData.paymentMethods;
export const clients = jasonBusinessData.clients;

// Sample invoices using real client data
export const invoices = [
  {
    id: 1001,
    clientId: 1,
    clientName: "Irina Realtor",
    date: '2024-08-01',
    dueDate: '2024-08-31',
    status: 'Sent',
    services: [
      { 
        description: 'Bi-weekly Mowing', 
        quantity: 2, 
        rate: 40.00, 
        amount: 80.00 
      }
    ],
    subtotal: 80.00,
    tax: 6.00,
    total: 86.00,
    notes: 'Bi-weekly grass cutting service',
    sentDate: '2024-08-01',
    paidDate: null,
    paymentMethod: ''
  },
  {
    id: 1002,
    clientId: 13,
    clientName: "Julie",
    date: '2024-07-01',
    dueDate: '2024-07-31',
    status: 'Paid',
    services: [
      { 
        description: 'Weekly Mowing and Plant Watering', 
        quantity: 1, 
        rate: 425.00, 
        amount: 425.00 
      }
    ],
    subtotal: 425.00,
    tax: 31.88,
    total: 456.88,
    notes: 'Monthly service package',
    sentDate: '2024-07-01',
    paidDate: '2024-07-15',
    paymentMethod: 'Zelle'
  },
  {
    id: 1003,
    clientId: 32,
    clientName: "Seaglass Management",
    date: '2024-07-15',
    dueDate: '2024-08-15',
    status: 'Pending',
    services: [
      { 
        description: '1776 Rita St - Bi-weekly Mowing', 
        quantity: 2, 
        rate: 70.00, 
        amount: 140.00 
      },
      { 
        description: '1716 Mova St - Bi-weekly Mowing', 
        quantity: 2, 
        rate: 70.00, 
        amount: 140.00 
      },
      { 
        description: '2135 Lee Ln - Bi-weekly Mowing', 
        quantity: 2, 
        rate: 82.50, 
        amount: 165.00 
      }
    ],
    subtotal: 445.00,
    tax: 33.38,
    total: 478.38,
    notes: 'Multiple AirBnB properties maintenance',
    sentDate: '2024-07-15',
    paidDate: null,
    paymentMethod: ''
  }
];

// Invoice Status Options
export const invoiceStatuses = [
  'Draft',
  'Sent', 
  'Pending',
  'Paid',
  'Overdue',
  'Cancelled'
];

// Helper functions for data management
export const getNextInvoiceId = () => {
  const maxId = Math.max(...invoices.map(inv => inv.id), 0);
  return maxId + 1;
};

export const getNextClientId = () => {
  const maxId = Math.max(...clients.map(client => client.id), 0);
  return maxId + 1;
};

export const getClientById = (id) => {
  return clients.find(client => client.id === parseInt(id));
};

export const getInvoiceById = (id) => {
  return invoices.find(invoice => invoice.id === parseInt(id));
};

export const getInvoicesByClientId = (clientId) => {
  return invoices.filter(invoice => invoice.clientId === parseInt(clientId));
};

export const getInvoicesByStatus = (status) => {
  return invoices.filter(invoice => invoice.status === status);
};

export const getTotalRevenue = () => {
  return invoices
    .filter(invoice => invoice.status === 'Paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
};

export const getPendingAmount = () => {
  return invoices
    .filter(invoice => invoice.status === 'Pending' || invoice.status === 'Sent')
    .reduce((sum, invoice) => sum + invoice.total, 0);
};

export const getOverdueAmount = () => {
  return invoices
    .filter(invoice => invoice.status === 'Overdue')
    .reduce((sum, invoice) => sum + invoice.total, 0);
};

// Data manipulation functions
export const addClient = (clientData) => {
  const newClient = {
    ...clientData,
    id: getNextClientId(),
    createdDate: new Date().toISOString().split('T')[0],
    totalInvoiced: 0,
    totalPaid: 0,
    status: 'Active'
  };
  clients.push(newClient);
  return newClient;
};

export const updateClient = (id, clientData) => {
  const index = clients.findIndex(client => client.id === parseInt(id));
  if (index !== -1) {
    clients[index] = { ...clients[index], ...clientData };
    return clients[index];
  }
  return null;
};

export const addInvoice = (invoiceData) => {
  const newInvoice = {
    ...invoiceData,
    id: getNextInvoiceId(),
    status: 'Draft',
    sentDate: null,
    paidDate: null
  };
  invoices.push(newInvoice);
  return newInvoice;
};

export const updateInvoice = (id, invoiceData) => {
  const index = invoices.findIndex(invoice => invoice.id === parseInt(id));
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...invoiceData };
    return invoices[index];
  }
  return null;
};

export const markInvoicePaid = (id, paymentMethod = '') => {
  const invoice = getInvoiceById(id);
  if (invoice) {
    updateInvoice(id, {
      status: 'Paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || invoice.paymentMethod
    });
    
    // Update client totals
    const client = getClientById(invoice.clientId);
    if (client) {
      client.totalPaid += invoice.total;
    }
    
    return true;
  }
  return false;
};

export const sendInvoice = (id) => {
  const invoice = getInvoiceById(id);
  if (invoice) {
    updateInvoice(id, {
      status: 'Sent',
      sentDate: new Date().toISOString().split('T')[0]
    });
    return true;
  }
  return false;
};

// Business management functions
export const addServiceArea = (areaName) => {
  if (areaName && !jasonBusinessData.businessInfo.serviceAreas.includes(areaName)) {
    jasonBusinessData.businessInfo.serviceAreas.push(areaName);
    return true;
  }
  return false;
};

export const removeServiceArea = (areaName) => {
  const index = jasonBusinessData.businessInfo.serviceAreas.indexOf(areaName);
  if (index > -1) {
    jasonBusinessData.businessInfo.serviceAreas.splice(index, 1);
    return true;
  }
  return false;
};

export const addService = (serviceData) => {
  const { name, priceRange, defaultRate } = serviceData;
  if (name && !jasonBusinessData.services.find(s => s.name === name)) {
    jasonBusinessData.services.push({
      name,
      priceRange: priceRange || '$0-$100',
      defaultRate: defaultRate || 0
    });
    return true;
  }
  return false;
};

export const removeService = (serviceName) => {
  const index = jasonBusinessData.services.findIndex(s => s.name === serviceName);
  if (index > -1) {
    jasonBusinessData.services.splice(index, 1);
    return true;
  }
  return false;
};

export const updateService = (serviceName, serviceData) => {
  const index = jasonBusinessData.services.findIndex(s => s.name === serviceName);
  if (index > -1) {
    jasonBusinessData.services[index] = { 
      ...jasonBusinessData.services[index], 
      ...serviceData 
    };
    return jasonBusinessData.services[index];
  }
  return null;
};

export const addPaymentMethod = (method) => {
  if (method && !jasonBusinessData.paymentMethods.includes(method)) {
    jasonBusinessData.paymentMethods.push(method);
    return true;
  }
  return false;
};

export const removePaymentMethod = (method) => {
  const index = jasonBusinessData.paymentMethods.indexOf(method);
  if (index > -1) {
    jasonBusinessData.paymentMethods.splice(index, 1);
    return true;
  }
  return false;
};

export default jasonBusinessData;