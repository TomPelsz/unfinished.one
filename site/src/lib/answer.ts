// The plain-language answer a component page leads with, and the title it is searched by. People ask
// "how long does a condensing boiler last", not for "Boiler, hot water, condensing", so pages use the
// everyday name below. Catalogue ids without one keep their catalogue name.
import { isInfrastructure } from './groups';

const COMMON: Record<string, string> = {
  'rtu-gas-electric': 'Gas/electric rooftop unit', 'rtu-heat-pump': 'Rooftop heat pump', 'make-up-air-unit': 'Make-up air unit',
  'ahu-indoor': 'Air handling unit', 'energy-recovery-ventilator': 'Energy recovery ventilator (ERV/HRV)', 'boiler-hw-condensing': 'Condensing boiler',
  'boiler-hw-noncondensing': 'Non-condensing hot water boiler', 'boiler-steam': 'Steam boiler', 'furnace-gas': 'Gas furnace',
  'chiller-air-cooled': 'Air-cooled chiller', 'chiller-water-cooled': 'Water-cooled chiller', 'condensing-unit': 'Split system condensing unit',
  'unit-heater-gas': 'Gas unit heater', 'unit-heater-hydronic': 'Hot water unit heater', 'infrared-heater-gas': 'Gas infrared tube heater',
  'ductless-split': 'Ductless mini-split heat pump', 'vav-box': 'VAV box', 'supply-return-fan': 'Supply or return fan',
  'pump-inline-circulator': 'Inline circulator pump', 'pump-base-mounted': 'Base-mounted end suction pump', 'heat-exchanger-plate': 'Plate heat exchanger',
  'baseboard-hydronic': 'Hydronic baseboard heater', 'humidifier-steam': 'Steam humidifier', 'crac-unit': 'Computer room air conditioner (CRAC)',
  'bas-supervisory-controller': 'Building automation controller', 'ddc-field-controller': 'DDC field controller', 'sensor-temperature': 'Temperature sensor',
  'sensor-pressure-flow': 'Pressure or flow sensor', 'control-valve': 'Control valve', 'damper-motorized': 'Motorized damper',
  'gas-detection': 'Gas detector', 'water-heater-gas-tank': 'Gas tank water heater', 'water-heater-electric-tank': 'Electric tank water heater',
  'water-heater-tankless': 'Tankless water heater', 'backflow-preventer': 'Backflow preventer', 'dhw-recirculation-pump': 'Hot water recirculation pump',
  'booster-pump': 'Domestic water booster pump', 'sewage-ejector': 'Sewage ejector pump', 'water-closet': 'Toilet', 'lavatory': 'Washroom sink and faucet',
  'drinking-fountain': 'Drinking fountain', 'switchgear-lv': 'Low-voltage switchgear', 'panelboard': 'Electrical panelboard',
  'transformer-dry': 'Dry-type transformer', 'transformer-pad-mounted': 'Pad-mounted transformer', 'mcc': 'Motor control centre',
  'ats': 'Automatic transfer switch', 'generator-diesel': 'Diesel generator', 'generator-natural-gas': 'Natural gas generator',
  'ups': 'UPS (uninterruptible power supply)', 'lighting-led-interior': 'LED light fixture', 'lighting-fluorescent': 'Fluorescent light fixture',
  'lighting-exterior-led': 'Exterior LED light', 'emergency-lighting': 'Emergency lighting unit', 'sprinkler-wet': 'Wet pipe sprinkler system',
  'sprinkler-dry': 'Dry pipe sprinkler system', 'fire-alarm-panel': 'Fire alarm panel', 'smoke-heat-detector': 'Smoke detector',
  'kitchen-hood-suppression': 'Kitchen hood fire suppression system', 'standpipe': 'Standpipe system', 'roof-modified-bitumen': 'Modified bitumen roof',
  'roof-built-up': 'Built-up roof', 'roof-epdm': 'EPDM roof', 'roof-tpo-pvc': 'TPO or PVC roof', 'roof-metal': 'Metal roof',
  'roof-asphalt-shingle': 'Asphalt shingle roof', 'window-aluminum': 'Aluminum window', 'window-vinyl': 'Vinyl window',
  'door-exterior-hollow-metal': 'Hollow metal exterior door', 'door-overhead': 'Overhead door', 'door-automatic': 'Automatic door',
  'elevator-hydraulic': 'Hydraulic elevator', 'elevator-traction': 'Traction elevator', 'platform-lift': 'Wheelchair platform lift',
  'ice-plant-compressor': 'Ice plant compressor', 'ice-plant-brine-chiller': 'Ice plant brine chiller', 'brine-pump': 'Ice plant brine pump',
  'evaporative-condenser': 'Evaporative condenser', 'arena-dehumidifier': 'Arena dehumidifier', 'ice-resurfacer': 'Ice resurfacer',
  'pool-sand-filter': 'Pool sand filter', 'pool-circulation-pump': 'Pool circulation pump', 'pool-chemical-controller': 'Pool chemical controller',
  'pool-dehumidifier': 'Pool dehumidifier', 'watermain-pvc': 'PVC watermain', 'watermain-ductile-iron': 'Ductile iron watermain',
  'watermain-cast-iron': 'Cast iron watermain', 'watermain-hdpe': 'HDPE watermain', 'watermain-concrete-pressure': 'Concrete pressure pipe watermain',
  'water-service-connection': 'Water service connection', 'fire-hydrant': 'Fire hydrant', 'water-valve': 'Watermain valve', 'water-meter': 'Water meter',
  'sanitary-sewer-pvc': 'PVC sanitary sewer', 'sanitary-sewer-concrete': 'Concrete sanitary sewer', 'sanitary-sewer-clay': 'Clay sanitary sewer',
  'sanitary-sewer-asbestos-cement': 'Asbestos cement sanitary sewer', 'sanitary-forcemain': 'Sanitary forcemain', 'sanitary-manhole': 'Sanitary manhole',
  'sanitary-service-lateral': 'Sewer service lateral', 'storm-sewer-concrete': 'Concrete storm sewer', 'storm-sewer-pvc': 'PVC storm sewer',
  'storm-manhole': 'Storm manhole', 'catch-basin': 'Catch basin', 'stormwater-pond': 'Stormwater pond', 'road-asphalt-surface': 'Asphalt road surface',
  'road-base': 'Road base', 'road-surface-treatment': 'Surface-treated road', 'road-gravel': 'Gravel road', 'road-concrete': 'Concrete road',
  'curb-gutter': 'Concrete curb and gutter', 'guardrail': 'Guide rail', 'parking-lot-asphalt': 'Asphalt parking lot', 'sidewalk-concrete': 'Concrete sidewalk',
  'streetlight': 'Streetlight', 'traffic-signal': 'Traffic signal', 'bridge-concrete': 'Concrete bridge', 'bridge-steel': 'Steel bridge',
  'bridge-deck': 'Bridge deck wearing surface', 'culvert-concrete': 'Concrete culvert', 'culvert-csp': 'Corrugated steel pipe culvert',
};
export const commonName = (id: string, name: string) => COMMON[id] ?? name;

const yrs = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(/\.0$/, ''));
const span = ([lo, hi]: number[]) => (lo === hi ? yrs(lo) : `${yrs(lo)}–${yrs(hi)}`);

// "Life expectancy" is how building owners search; municipalities say "useful life" for infrastructure.
export const lifeTerm = (group?: string) => (group && isInfrastructure(group) ? 'useful life' : 'life expectancy');

export const pageTitle = (e: any, group?: string) =>
  `${commonName(e.id, e.names[0])} ${lifeTerm(group)}: ${yrs(e.service_life.median_years)} years`;

// One or two sentences, true to how the number was made: a single source is named as such, and a
// spread of stated lives is not presented as a spread of real units.
export function answer(e: any, sourceCount: number, group?: string) {
  const sl = e.service_life;
  const name = commonName(e.id, e.names[0]);
  // "A condensing boiler", "An HDPE watermain": acronyms keep their capitals and take the article by sound.
  const acronym = /^[A-Z]{2,}\b/.test(name);
  const what = acronym ? name : name.charAt(0).toLowerCase() + name.slice(1);
  const an = acronym ? /^[AEFHILMNORSX]/.test(name) : /^[aeiou]/i.test(name);
  const lead = `${an ? 'An' : 'A'} ${what} ${group && isInfrastructure(group) ? 'has a useful life of' : 'lasts'} about ${yrs(sl.median_years)} years`;
  if (sl.range_basis !== 'source_spread') return `${lead}; 80% of units last ${span(sl.range_years)} years.`;
  if (sourceCount === 1) return `${lead}, as stated by the one published source on file.`;
  const same = sl.range_years[0] === sl.range_years[1];
  return `${lead}, the median of ${sourceCount} published sources, which ${same ? 'all state' : 'state'} ${span(sl.range_years)} years.`;
}
