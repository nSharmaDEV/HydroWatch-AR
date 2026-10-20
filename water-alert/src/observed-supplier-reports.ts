import type { AnnualReport, AnnualReportIssue } from './annual-reports'

// Manual, whole-document review on 2026-10-19. Exact feed ID → ADH PWS,
// never a fuzzy name match at runtime. See docs/research/adh-ccr-2025/README.md.
type Text = { en: string; es: string }
const text = (en: string, es: string): Text => ({ en, es })
const notProvided = text('Not provided in the report', 'No indicado en el informe')
const resumed = text('Resumed bacteriological monitoring as required by state and federal regulations', 'Se reanudó el monitoreo bacteriológico según las normas estatales y federales')
const licensed = text('Operator obtained the required license and the system is in compliance, according to the report', 'El operador obtuvo la licencia requerida y el sistema cumple, según el informe')
function monitoring(from: string, through: string, page: number, reporting = false): AnnualReportIssue {
  return { category: 'monitoring', heading: text('Bacteriological monitoring', 'Monitoreo bacteriológico'), title: reporting ? text('Failed to monitor and/or report sample results as specified in the RTCR', 'No se monitorearon y/o reportaron los resultados de muestras según la RTCR') : text('Failed to submit the proper number of valid bacteriological samples', 'No se presentó la cantidad requerida de muestras bacteriológicas válidas'), reportedFrom: from, reportedThrough: through, action: reporting ? text('Resumed submission of sampling reports as required by state and federal regulations', 'Se reanudó la presentación de informes de muestreo según las normas estatales y federales') : resumed, page }
}
function licensing(from: string, through: string): AnnualReportIssue {
  return { category: 'licensing', heading: text('State licensing', 'Licencia estatal'), title: text('State licensing regulations were not met', 'No se cumplieron las normas estatales de licencia'), reportedFrom: from, reportedThrough: through, action: licensed, page: 2 }
}
function deficiency(date: string | undefined, title: Text, action: Text, page = 2): AnnualReportIssue {
  return { category: 'significantDeficiency', heading: text('Significant deficiencies', 'Deficiencias significativas'), dateLabel: text('Survey / inspection date reported', 'Fecha de inspección reportada'), reportedFrom: date, title, action, page }
}
function publicNotice(from: string, through: string, title: Text, action: Text): AnnualReportIssue {
  return { category: 'publicNotice', heading: text('Public notice', 'Aviso público'), title, action, reportedFrom: from, reportedThrough: through, page: 2 }
}
const upstreamTurbidity: AnnualReportIssue = { category: 'upstreamSupplier', heading: text('Upstream supplier turbidity', 'Turbidez del proveedor de origen'), title: text('The Community Water turbidity row is marked Y for violation: highest 2.49 NTU; lowest monthly percentage meeting the limit 99.4%. These are upstream supplier results, not a current measurement at this utility.', 'La fila de turbidez de Community Water indica Y (infracción): máximo 2.49 NTU; porcentaje mensual mínimo que cumple el límite 99.4%. Son resultados del proveedor de origen, no una medición actual de este sistema.'), action: notProvided, page: 2 }
function reviewed(pws: string, issues: readonly AnnualReportIssue[] = [], note?: Text): readonly AnnualReport[] {
  return [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: `https://health.arkansas.gov/eng/d.aspx?P=${pws}&YEAR=2025`, issues, ...(note ? { note } : {}) }]
}
function unavailable(pws: string): readonly AnnualReport[] {
  return [{ year: 2025, state: 'unavailable', sourceUrl: `https://health.arkansas.gov/eng/WS.aspx?ID=${pws}`, note: text(`Checked Oct 19, 2026: no 2025 PDF found in ADH’s annual-report search. The ADH directory identifies ${pws} as a transient non-community system. No report findings or safety conclusion can be inferred.`, `Revisado el 19 de octubre de 2026: no se encontró un PDF de 2025 en la búsqueda de informes de ADH. El directorio identifica ${pws} como sistema transitorio no comunitario. No se pueden inferir hallazgos ni conclusiones de seguridad.`) }]
}

export const OBSERVED_SUPPLIER_REPORTS: Readonly<Record<string, readonly AnnualReport[]>> = {
  // Banks Waterworks
  'ADH:573b41ace89198422234fda05a66c8043cfaf5b9110349079912b75c64741bd0': reviewed('068', [publicNotice('05/01/2025', '12/31/2025', text('Failed to conduct public notice for the total coliform monitoring violation within the mandated timeframe', 'No se realizó el aviso público sobre la infracción de monitoreo de coliformes totales dentro del plazo obligatorio'), text('No corrective action taken', 'No se tomó ninguna acción correctiva'))]),
  // Smackover Waterworks
  'ADH:62bf401b065d0ff341e7ab9dbbfd57e99db5783c3ced3383494219e08926fb86': reviewed('555'),
  // Waldron Waterworks — no inspection date printed in the deficiency section.
  'ADH:e3a609125c8dbbdc5a0f94d2b9f301a5ea1bf1c8a7fdb26411b27070ada05b9c': reviewed('498', [deficiency(undefined, text('Several tank and standpipe roof vents need repairs; the Brigance standpipe cable float indicator must be removed or repaired.', 'Se requieren reparaciones en las ventilaciones de varios tanques; el indicador de flotador por cable del tanque Brigance debe retirarse o repararse.'), text('We are working to address this deficiency', 'Se está trabajando para corregir esta deficiencia'))]),
  // North Jackson County Rural Water Association
  'ADH:dca2e7f080b8ddd909498d21d8baa011da9fb424aef1352a4c4506283815990a': reviewed('767'),
  // Tuckerman Waterworks
  'ADH:c8aa1b0178e1fe33110e44dc55b9065c631dc701bf7534967eb0fcd49a052c3f': reviewed('266'),
  // Cross County Rural Water System
  'ADH:2c15921bcf6d2b37db97fbab65ba8adde0b65ca7cb8654a0dfe547bb7036dd09': reviewed('459', [deficiency('03/21/2023', text('Water storage tanks are overdue for inspections required at least every five years.', 'Los tanques de almacenamiento tienen inspecciones vencidas; se requieren al menos cada cinco años.'), text('Securing funding to rehabilitate tanks, including the clearwells', 'Se están buscando fondos para rehabilitar los tanques, incluidos los depósitos de agua tratada'))]),
  // Sylamore Valley Water Association
  'ADH:74ade4dfe3721f77ed2756a11406ffc00e45dbdbcc6c956745dbb8573d4153ea': reviewed('882', [monitoring('07/01/2025', '07/31/2025', 2)]),
  // Midway Water Association, Crittenden County (not Lakeview-Midway).
  'ADH:a12f41b2b9ea15999a66e205359086a4e565a7733f5f0d4b791e653f5b30ec03': reviewed('153'),
  // Riverside Resort at Kings River, not Riverside Resort T1037.
  'ADH:12bb8f46cb9fd02f88bf88b6d20172df4c34e235781dd5d43199b24761259eba': unavailable('T0467'),
  // Holly Grove Waterworks
  'ADH:0f8b954e9aa2f3d1deeb3b2b8125ca21afe1e6716b670b5a6ca3449f03a6219d': reviewed('388', [deficiency('12/08/2023', text('Storage tanks have not been inspected for more than five years.', 'Los tanques de almacenamiento no se han inspeccionado en más de cinco años.'), text('The water system submitted a plan for tank inspections', 'El sistema presentó un plan de inspecciones de tanques'))]),
  // Central Logan County PWFB: retain the conflict, do not resolve it ourselves.
  'ADH:410e67db91f7d62c58b60070829a626df9b22f370e9f034925149311abe84287': reviewed('845', [
    { category: 'documentConflict', heading: text('HAA5 table / footnote conflict', 'Contradicción de HAA5 entre tabla y nota'), title: text('HAA5 is marked Y in the violation column, but the listed highest running annual average is 58 ppb against a 60 ppb MCL and the footnote says no HAA5 violations. Confirmation is needed from the utility or ADH.', 'HAA5 indica Y en la columna de infracciones, pero el promedio anual móvil máximo es 58 ppb frente al límite de 60 ppb y la nota dice que no hubo infracciones de HAA5. Se requiere confirmación del proveedor o de ADH.'), action: notProvided, page: 2 },
    deficiency('01/04/2024', text('Tank rehabilitation is needed to reduce leaks and metal decay and remove sediment.', 'Se necesita rehabilitar el tanque para reducir fugas y deterioro del metal y retirar sedimentos.'), text('Working to secure funding for tank and infrastructure repairs', 'Se están buscando fondos para reparar el tanque y la infraestructura')),
  ], text('Document conflict: the HAA5 table marks Y, while the footnote says no violations. The statements are inconsistent; this review does not resolve the discrepancy or establish current compliance.', 'Contradicción del documento: la tabla de HAA5 indica Y, pero la nota dice que no hubo infracciones. Las afirmaciones son inconsistentes; esta revisión no resuelve la contradicción ni determina el cumplimiento actual.')),
  // South Mountain Water Association
  'ADH:48b60fbd46da25141439df596676074dbda0bb07f32053f4dc48bcb987edeba1': reviewed('815'),
  // Brunner Hill Public Water Authority
  'ADH:39e0d7b57f74fdf7084a73ed951a0068e326d23223986d271b4d4f2ee8845e35': reviewed('837', [licensing('04/01/2025', '05/31/2025')]),
  // Bergman Waterworks
  'ADH:da62ed37b05b8ebd3bd0abfc13095400f919abbc413c6422de0939f3d0073123': reviewed('060'),
  // East Johnson County Water Association
  'ADH:f8b097675075d67ac8a3501f358dd18c8d8ea84afa903488c53b50d35ce93c87': reviewed('772', [{ category: 'waterQuality', heading: text('Total haloacetic acids (HAA5)', 'Ácidos haloacéticos totales (HAA5)'), title: text('The running annual average exceeded the 60 ppb MCL: fourth-quarter average 61 ppb at Site YD008.', 'El promedio anual móvil superó el límite de 60 ppb: promedio del cuarto trimestre de 61 ppb en el sitio YD008.'), reportedFrom: '10/01/2025', reportedThrough: '01/01/2026', action: text('Reviewing disinfection procedures and working on a solution to lower disinfection byproducts in the distribution system', 'Se están revisando los procedimientos de desinfección y buscando una solución para reducir sus subproductos en la red'), page: 3 }]),
  // Flippin Waterworks
  'ADH:b14abf76a55845b0bb11b47e18977509249beb34534f2263c5ea01a141b5925b': reviewed('351'),
  // Glen Acres
  'ADH:b603457dbbdc01ccdf6783a16bdd384e032259488d9e4eed5dcd872aa1557c89': reviewed('857', [deficiency('01/14/2025', text('The tank vent needs a #24 mesh screen; a color photograph must be submitted to ADH.', 'La ventilación del tanque necesita malla n.º 24; se debe enviar una fotografía en color a ADH.'), text('No progress reported', 'No se reportaron avances'))]),
  // Mockingbird Hill Water Association
  'ADH:a505cc396de76ffa77fbb8ef7caff101fd0a7cfa3198841287784d13d89ad9c7': reviewed('042', [deficiency('11/14/2024', text('Tanks 1 and 2 are overdue for the required five-year inspections; inspection results must be submitted to ADH.', 'Los tanques 1 y 2 tienen vencidas las inspecciones quinquenales; los resultados deben enviarse a ADH.'), text('A plan is in place to correct the deficiencies', 'Hay un plan para corregir las deficiencias'), 3), monitoring('05/01/2025', '05/31/2025', 3, true), monitoring('08/01/2025', '08/31/2025', 3, true)]),
  // Leslie Water System — upstream turbidity is explicitly attributed.
  'ADH:02cb014bef8a82412f4e855b029446ca9bdeade1bd8655f44abb39350e718682': reviewed('500', [upstreamTurbidity, { ...monitoring('09/01/2025', '10/31/2025', 2, true), action: text('Resumed bacteriological monitoring and submission of sampling reports as required by state and federal regulations', 'Se reanudaron el monitoreo bacteriológico y la presentación de informes de muestreo según las normas estatales y federales') }, monitoring('09/01/2025', '09/30/2025', 2), licensing('09/01/2025', '10/31/2025')]),
  // West Stone County Water Association
  'ADH:1f17d89c87a89f004a71c5917ebc694d83031c66eabf12e52a59f855baa1daa0': reviewed('735', [upstreamTurbidity, monitoring('05/01/2025', '05/31/2025', 2)]),
  // Lead Hill Waterworks
  'ADH:2d4c0fafe8c636fbc7555d68cec719635be1e66e6eccf62f71269a6a4a2a19dd': reviewed('063', [licensing('01/01/2025', '04/01/2025'), ...[['03/01/2025', '03/31/2025'], ['05/01/2025', '05/31/2025']].map(([from, through]) => publicNotice(from, through, text('Failed to provide public education notice regarding operator licensure within the mandated timeframe', 'No se proporcionó el aviso de educación pública sobre la licencia del operador dentro del plazo obligatorio'), text('Public notice conducted in November 2025', 'Se realizó el aviso público en noviembre de 2025')))]),
  // Fort Smith Water Utilities — physical page 3, despite footer "3 of 2".
  'ADH:6e9a20f3e00cb91c44f1085265928d4ad99e308ef8bd53ef628c89f8a753162b': reviewed('507', [deficiency('03/25/2025', text('Several tanks need screening repairs and grading work.', 'Varios tanques necesitan reparaciones de mallas y trabajos de nivelación del terreno.'), text('No corrective action taken', 'No se tomó ninguna acción correctiva'), 3)]),
  // Palestine Water Association
  'ADH:5f4986a6a9331a48c8f43286111e6299c98be5ace3d850aa47881c7ba733058a': reviewed('536'),
  // Dover Waterworks
  'ADH:7eea5393b7363d6dfd4f223e6b6de7d4a57a71ed2749a3b0ea2dd3927004f92a': reviewed('444'),
  // Texarkana Water Utilities: the PDF's Arkansas / Millwood scope, not all Texas service.
  'ADH:6648e4db8d9deee84cfcc11c7421166901949dcedec15c0df5b13cf7162a8fe7': reviewed('360', [], text('This ADH report primarily covers the Millwood water treatment plant supplying the Arkansas section of Texarkana. It is not a review of all Texas-side service.', 'Este informe de ADH cubre principalmente la planta de Millwood que abastece la parte de Texarkana en Arkansas. No es una revisión de todo el servicio del lado de Texas.')),
  // Salem Water Users, Saline County, not Salem Waterworks in Fulton County.
  'ADH:dbf53925bdd33aa59425250c763c498e78d49d9b9dafa33585f495b829f2d212': reviewed('492', [monitoring('04/01/2025', '04/30/2025', 3), monitoring('10/01/2025', '12/31/2025', 3)]),
  // USCOE OC - Little Fir, not Little Fir Landing T0330.
  'ADH:517d90b862897b092ed779c9b347f45cd1e4d461f8855ee611f49e7bd6fce65e': unavailable('T0718'),
  // Gurdon Waterworks
  'ADH:734db608102088dbce04b8d92156cc248a9cc375a70905fe288aca9f5f550c4a': reviewed('087', [deficiency('04/22/2025', text('Several tanks require modifications or inspections; the Airport Well lubricant should meet food-grade standards.', 'Varios tanques requieren modificaciones o inspecciones; el lubricante del pozo Airport debe cumplir las normas de grado alimentario.'), text('As of the report date, working to correct the listed deficiencies', 'A la fecha del informe, se estaba trabajando para corregir las deficiencias indicadas'))]),
  // Newport Waterworks
  'ADH:ca6ccc23d097ff186823c601fe725e0f4f63d89083b8b0e27f2a24d41ee1df58': reviewed('264'),
  // Bull Shoals Water System, not Lake Bull Shoals Estates.
  'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d': reviewed('352', [deficiency('11/06/2024', text('Tank 2 needs roof vent improvements, a roof hatch gasket, and proper welding or sealing of sheet metal.', 'El tanque 2 necesita mejoras de ventilación, una junta en la escotilla y soldadura o sellado adecuado de la chapa.'), text('Working to correct the deficiencies, with completion expected in May 2026 according to the report; completion has not been verified here', 'Se estaba trabajando para corregir las deficiencias, con finalización prevista para mayo de 2026 según el informe; aquí no se ha verificado su finalización'))]),
}
