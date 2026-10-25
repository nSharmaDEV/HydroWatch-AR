/** Reviewed reference points only. Never join by city/county or infer affected areas. */
export interface SupplierLocation {
  placeId: string
  sourceName: string
  longitude: number
  latitude: number
  sourceUrl: string
  verifiedAt: string
  pointMeaning: 'historical-polygon-centroid' | 'provider-office' | 'provider-site' | 'recreation-site'
  /** Public evidence connecting a different source name/site to this exact supplier. */
  identitySourceUrls?: readonly string[]
  identityNote?: string
}
const source = 'https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Utilities/FeatureServer/15/query'
const gisSource = (objectId: number) => `${source}?objectIds=${objectId}&outFields=objectid,pws_name&returnGeometry=false&returnCentroid=true&outSR=4326&f=pjson`
// GIS points use exact pws_name matches unless identity evidence is recorded below.
// ArcGIS returnCentroid=true, outSR=4326; these are historical polygon reference points.
// Office/site points are separately labeled. None describes an advisory's affected area.
export const SUPPLIER_LOCATIONS: readonly SupplierLocation[] = [
  { placeId: 'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d', sourceName: 'BULL SHOALS WATER SYSTEM', longitude: -92.590260, latitude: 36.374799, sourceUrl: `${source}?objectIds=315&outFields=objectid,pws_name&returnGeometry=false&returnCentroid=true&outSR=4326&f=pjson`, verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275', sourceName: 'FAYETTEVILLE WATERWORKS', longitude: -94.133225, latitude: 36.081088, sourceUrl: `${source}?objectIds=471&outFields=objectid,pws_name&returnGeometry=false&returnCentroid=true&outSR=4326&f=pjson`, verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:573b41ace89198422234fda05a66c8043cfaf5b9110349079912b75c64741bd0', sourceName: 'BANKS WATERWORKS', longitude: -92.270680, latitude: 33.573840, sourceUrl: gisSource(69), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:da62ed37b05b8ebd3bd0abfc13095400f919abbc413c6422de0939f3d0073123', sourceName: 'BERGMAN WATERWORKS', longitude: -93.011796, latitude: 36.317892, sourceUrl: gisSource(165), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:410e67db91f7d62c58b60070829a626df9b22f370e9f034925149311abe84287', sourceName: 'CENTRAL LOGAN COUNTY PWFB', longitude: -93.803820, latitude: 35.237210, sourceUrl: gisSource(729), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:2c15921bcf6d2b37db97fbab65ba8adde0b65ca7cb8654a0dfe547bb7036dd09', sourceName: 'CROSS COUNTY RURAL WATER SYS', longitude: -90.970017, latitude: 35.353595, sourceUrl: gisSource(463), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:7eea5393b7363d6dfd4f223e6b6de7d4a57a71ed2749a3b0ea2dd3927004f92a', sourceName: 'DOVER WATERWORKS', longitude: -93.114872, latitude: 35.390266, sourceUrl: gisSource(426), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:f8b097675075d67ac8a3501f358dd18c8d8ea84afa903488c53b50d35ce93c87', sourceName: 'EAST JOHNSON CO WATER ASSN', longitude: -93.310875, latitude: 35.457539, sourceUrl: gisSource(387), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:b14abf76a55845b0bb11b47e18977509249beb34534f2263c5ea01a141b5925b', sourceName: 'FLIPPIN WATERWORKS', longitude: -92.584446, latitude: 36.290428, sourceUrl: gisSource(255), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:6e9a20f3e00cb91c44f1085265928d4ad99e308ef8bd53ef628c89f8a753162b', sourceName: 'FORT SMITH WATER UTILITIES', longitude: -94.361627, latitude: 35.347467, sourceUrl: gisSource(360), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:b603457dbbdc01ccdf6783a16bdd384e032259488d9e4eed5dcd872aa1557c89', sourceName: 'GLEN ACRES', longitude: -93.820789, latitude: 36.356807, sourceUrl: gisSource(151), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:734db608102088dbce04b8d92156cc248a9cc375a70905fe288aca9f5f550c4a', sourceName: 'GURDON WATERWORKS', longitude: -93.142724, latitude: 33.918638, sourceUrl: gisSource(6), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:0f8b954e9aa2f3d1deeb3b2b8125ca21afe1e6716b670b5a6ca3449f03a6219d', sourceName: 'HOLLY GROVE WATERWORKS', longitude: -91.152084, latitude: 34.560980, sourceUrl: gisSource(183), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:2d4c0fafe8c636fbc7555d68cec719635be1e66e6eccf62f71269a6a4a2a19dd', sourceName: 'LEAD HILL WATERWORKS', longitude: -92.907386, latitude: 36.407971, sourceUrl: gisSource(555), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', sourceName: 'LEISURE HILLS MOBILE HOME PARK', longitude: -94.292067, latitude: 36.478725, sourceUrl: gisSource(316), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:02cb014bef8a82412f4e855b029446ca9bdeade1bd8655f44abb39350e718682', sourceName: 'LESLIE WATER SYSTEM', longitude: -92.571615, latitude: 35.848505, sourceUrl: gisSource(466), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:a12f41b2b9ea15999a66e205359086a4e565a7733f5f0d4b791e653f5b30ec03', sourceName: 'MIDWAY WATER ASSOCIATION', longitude: -90.293715, latitude: 35.094683, sourceUrl: gisSource(588), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:a505cc396de76ffa77fbb8ef7caff101fd0a7cfa3198841287784d13d89ad9c7', sourceName: 'MOCKINGBIRD HILL WATER ASSOC', longitude: -93.164498, latitude: 35.950977, sourceUrl: gisSource(545), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:ca6ccc23d097ff186823c601fe725e0f4f63d89083b8b0e27f2a24d41ee1df58', sourceName: 'NEWPORT WATERWORKS', longitude: -91.232776, latitude: 35.624715, sourceUrl: gisSource(72), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:5f4986a6a9331a48c8f43286111e6299c98be5ace3d850aa47881c7ba733058a', sourceName: 'PALESTINE WATER ASSOCIATION', longitude: -90.938368, latitude: 34.971862, sourceUrl: gisSource(468), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:62bf401b065d0ff341e7ab9dbbfd57e99db5783c3ced3383494219e08926fb86', sourceName: 'SMACKOVER WATERWORKS', longitude: -92.696151, latitude: 33.368244, sourceUrl: gisSource(761), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:48b60fbd46da25141439df596676074dbda0bb07f32053f4dc48bcb987edeba1', sourceName: 'SOUTH MOUNTAIN WATER ASSN', longitude: -92.682273, latitude: 35.846028, sourceUrl: gisSource(24), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:74ade4dfe3721f77ed2756a11406ffc00e45dbdbcc6c956745dbb8573d4153ea', sourceName: 'SYLAMORE VALLEY WATER ASSN', longitude: -92.102284, latitude: 35.943561, sourceUrl: gisSource(744), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:6648e4db8d9deee84cfcc11c7421166901949dcedec15c0df5b13cf7162a8fe7', sourceName: 'TEXARKANA WATER UTILITIES', longitude: -93.989829, latitude: 33.385703, sourceUrl: gisSource(359), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:c8aa1b0178e1fe33110e44dc55b9065c631dc701bf7534967eb0fcd49a052c3f', sourceName: 'TUCKERMAN WATERWORKS', longitude: -91.200101, latitude: 35.727428, sourceUrl: gisSource(158), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:e3a609125c8dbbdc5a0f94d2b9f301a5ea1bf1c8a7fdb26411b27070ada05b9c', sourceName: 'WALDRON WATERWORKS', longitude: -94.100007, latitude: 34.898710, sourceUrl: gisSource(171), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  { placeId: 'ADH:1f17d89c87a89f004a71c5917ebc694d83031c66eabf12e52a59f855baa1daa0', sourceName: 'WEST STONE COUNTY WATER ASSN', longitude: -92.308061, latitude: 35.801404, sourceUrl: gisSource(302), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid' },
  {
    placeId: 'ADH:39e0d7b57f74fdf7084a73ed951a0068e326d23223986d271b4d4f2ee8845e35', sourceName: 'BRUNNER HILL WATER ASSOC', longitude: -92.143719, latitude: 36.225723,
    sourceUrl: gisSource(505), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid',
    identitySourceUrls: ['https://brunnerhillwater.com/news-detail?item_id=41750'],
    identityNote: 'Provider documents April 2026 conversion from Brunner Hill Water Association Inc. to Brunner Hill Public Water Authority. Historical polygon retained only as a reference point.',
  },
  {
    placeId: 'ADH:dca2e7f080b8ddd909498d21d8baa011da9fb424aef1352a4c4506283815990a', sourceName: 'NORTH JACKSON CO WATER ASSN', longitude: -91.193326, latitude: 35.776026,
    sourceUrl: gisSource(157), verifiedAt: '2026-10-21', pointMeaning: 'historical-polygon-centroid',
    identitySourceUrls: ['https://health.arkansas.gov/Eng/WS.aspx?ID=767', 'https://media.ark.org/agri/Fiscal-Distress-List-UPDATED-2.18.26.pdf'],
    identityNote: 'ADH uses North Jackson Co Rural Water Assn, PWS 767. Arkansas agriculture lists the abbreviated North Jackson Co Water Assn under the same PWS 767.',
  },
  {
    placeId: 'ADH:dbf53925bdd33aa59425250c763c498e78d49d9b9dafa33585f495b829f2d212', sourceName: 'Salem Water Users PWA office', longitude: -92.605394, latitude: 34.5588539,
    sourceUrl: 'https://salemwater.ruralwaterusa.com/location', verifiedAt: '2026-10-21', pointMeaning: 'provider-office',
    identitySourceUrls: ['https://health.arkansas.gov/Eng/WS.aspx?ID=492'],
    identityNote: 'Provider location page publishes this office map point at 620 Airlane Drive, matching the ADH Salem Water Users LLC PWS 492 office address. Not a service-area centroid.',
  },
  {
    placeId: 'ADH:12bb8f46cb9fd02f88bf88b6d20172df4c34e235781dd5d43199b24761259eba', sourceName: "Riverside Resort King's River property", longitude: -93.638653, latitude: 36.3960887,
    sourceUrl: 'https://bookeurekacabins.com/en/cabin-1-fishermans-cottage', verifiedAt: '2026-10-21', pointMeaning: 'provider-site',
    identitySourceUrls: ['https://health.arkansas.gov/Eng/WS.aspx?ID=T0467', 'https://bookeurekacabins.com/en/about'],
    identityNote: 'Provider property JSON-LD publishes these coordinates; its Riverside Resort identity and 3031 Hwy 62 West address match ADH PWS T0467. A resort property reference, not a water-system asset location.',
  },
  {
    placeId: 'ADH:517d90b862897b092ed779c9b347f45cd1e4d461f8855ee611f49e7bd6fce65e', sourceName: 'Little Fir, Lake Ouachita', longitude: -93.470246, latitude: 34.632064,
    sourceUrl: 'https://www.recreation.gov/camping/campgrounds/10053729', verifiedAt: '2026-10-21', pointMeaning: 'recreation-site',
    identitySourceUrls: ['https://health.arkansas.gov/Eng/WS.aspx?ID=T0718', 'https://www.recreation.gov/camping/campgrounds/10053729'],
    identityNote: 'Recreation.gov campground areaServed GeoCoordinates for USACE Little Fir on Lake Ouachita; ADH identifies USCOE OC - Little Fir as PWS T0718. Not the ADH contact mailing address or a water-system asset location.',
  },
]

export function projectArkansas(longitude: number, latitude: number) {
  return { x: (longitude + 94.7) * 110 + 30, y: (36.55 - latitude) * 135 + 30 }
}
