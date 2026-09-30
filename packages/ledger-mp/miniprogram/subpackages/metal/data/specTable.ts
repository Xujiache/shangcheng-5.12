export type SectionShape = 'angle' | 'channel' | 'ibeam' | 'hbeam' | 'cpurlin' | 'aluminum'
export interface SpecRow {
  shape: SectionShape
  model: string
  aliases: string[]
  thicknessMm?: number
  kgPerM: number
  source: string
}

const GB706 = 'GB/T 706-2016 附录A 表A.3（等边角钢）'
const GB706_CHANNEL = 'GB/T 706-2016 附录A 表A.2（槽钢）'
const GB706_IBEAM = 'GB/T 706-2016 附录A 表A.1（工字钢）'
const MISUMI_20_40 = '米思米 NFS5 铝型材目录 p2119（A6063S-T5）'
const MISUMI_30 = '米思米 NFS6 铝型材目录 p2127（A6063S-T5）'
const GB11263 = 'GB/T 11263-2024 附录A 表A.1（H型钢）'
const JLC_C = '嘉立创FA机械设计手册：冷弯内卷边槽钢（GB/T 6723-2017）'

const angle = (model: string, kgPerM: number): SpecRow => ({
  shape: 'angle', model, aliases: [], thicknessMm: Number(model.split('*')[1]), kgPerM, source: GB706,
})
const channelThickness: Record<string, number> = {
  '5': 4.5, '6.3': 4.8, '6.5': 4.3, '8': 5, '10': 5.3, '12': 5.5, '12.6': 5.5,
  '14A': 6, '14B': 8, '16A': 6.5, '16B': 8.5, '18A': 7, '18B': 9,
  '20A': 7, '20B': 9, '22A': 7, '22B': 9, '24A': 7, '24B': 9, '24C': 11,
  '25A': 7, '25B': 9, '25C': 11, '27A': 7.5, '27B': 9.5, '27C': 11.5,
  '28A': 7.5, '28B': 9.5, '28C': 11.5, '30A': 7.5, '30B': 9.5, '30C': 11.5,
  '32A': 8, '32B': 10, '32C': 12, '36A': 9, '36B': 11, '36C': 13,
  '40A': 10.5, '40B': 12.5, '40C': 14.5,
}
const ibeamThickness: Record<string, number> = {
  '10': 4.5, '12': 5, '12.6': 5, '14': 5.5, '16': 6, '18': 6.5,
  '20A': 7, '20B': 9, '22A': 7.5, '22B': 9.5, '24A': 8, '24B': 10,
  '25A': 8, '25B': 10, '27A': 8.5, '27B': 10.5, '28A': 8.5, '28B': 10.5,
  '30A': 9, '30B': 11, '30C': 13, '32A': 9.5, '32B': 11.5, '32C': 13.5,
  '36A': 10, '36B': 12, '36C': 14, '40A': 10.5, '40B': 12.5, '40C': 14.5,
  '45A': 11.5, '45B': 13.5, '45C': 15.5, '50A': 12, '50B': 14, '50C': 16,
  '55A': 12.5, '55B': 14.5, '55C': 16.5, '56A': 12.5, '56B': 14.5, '56C': 16.5,
  '63A': 13, '63B': 15, '63C': 17,
}
const channel = (model: string, kgPerM: number): SpecRow => ({
  shape: 'channel', model, aliases: [model.replace('#', '')], thicknessMm: channelThickness[model.replace('#', '')], kgPerM, source: GB706_CHANNEL,
})
const ibeam = (model: string, kgPerM: number): SpecRow => ({
  shape: 'ibeam', model, aliases: [model.replace('#', '')], thicknessMm: ibeamThickness[model.replace('#', '')], kgPerM, source: GB706_IBEAM,
})
const hbeam = (model: string, kgPerM: number, thicknessMm: number, alias: string): SpecRow => ({
  shape: 'hbeam', model, aliases: [alias], thicknessMm, kgPerM, source: GB11263,
})
const cpurlin = (model: string, kgPerM: number): SpecRow => ({
  shape: 'cpurlin', model, aliases: [model.replace(/^C/, '')], thicknessMm: Number(model.split('*').pop()), kgPerM, source: JLC_C,
})

/** Only rows verified against the named standard/catalogue are exposed. */
export const SPEC_TABLE: SpecRow[] = [
  angle('20*3', 0.89), angle('20*4', 1.15),
  angle('25*3', 1.12), angle('25*4', 1.46),
  angle('30*3', 1.37), angle('30*4', 1.79),
  angle('36*3', 1.66), angle('36*4', 2.16), angle('36*5', 2.65),
  angle('40*3', 1.85), angle('40*4', 2.42), angle('40*5', 2.98),
  angle('45*3', 2.09), angle('45*4', 2.74), angle('45*5', 3.37), angle('45*6', 3.99),
  angle('50*3', 2.33), angle('50*4', 3.06), angle('50*5', 3.77), angle('50*6', 4.46),
  angle('56*3', 2.62), angle('56*4', 3.45), angle('56*5', 4.25), angle('56*6', 5.04), angle('56*7', 5.81), angle('56*8', 6.57),
  angle('60*5', 4.58), angle('60*6', 5.43), angle('60*7', 6.26), angle('60*8', 7.08),
  angle('63*4', 3.91), angle('63*5', 4.82), angle('63*6', 5.72), angle('63*7', 6.60), angle('63*8', 7.47), angle('63*10', 9.15),
  angle('70*4', 4.37), angle('70*5', 5.40), angle('70*6', 6.41), angle('70*7', 7.40), angle('70*8', 8.37),
  angle('75*5', 5.82), angle('75*6', 6.91), angle('75*7', 7.98), angle('75*8', 9.03), angle('75*9', 10.1), angle('75*10', 11.1),
  angle('80*5', 6.21), angle('80*6', 7.38), angle('80*7', 8.53), angle('80*8', 9.66), angle('80*9', 10.8), angle('80*10', 11.9),
  angle('90*6', 8.35), angle('90*7', 9.66), angle('90*8', 10.9), angle('90*9', 12.2), angle('90*10', 13.5), angle('90*12', 15.9),
  angle('100*6', 9.37), angle('100*7', 10.8), angle('100*8', 12.3), angle('100*9', 13.7), angle('100*10', 15.1), angle('100*12', 17.9), angle('100*14', 20.6), angle('100*16', 23.3),
  angle('125*8', 15.5), angle('125*10', 19.1), angle('125*12', 22.7), angle('125*14', 26.2), angle('125*16', 29.6),
  angle('150*8', 18.6), angle('150*10', 23.1), angle('150*12', 27.4), angle('150*14', 31.7), angle('150*16', 35.9),
  angle('200*14', 42.9), angle('200*16', 48.7), angle('200*18', 54.4), angle('200*20', 60.1), angle('200*24', 71.2),
  channel('5#', 5.44), channel('6.3#', 6.63), channel('6.5#', 6.51),
  channel('8#', 8.04), channel('10#', 10.0), channel('12#', 12.1), channel('12.6#', 12.3),
  channel('14A#', 14.5), channel('14B#', 16.7),
  channel('16A#', 17.2), channel('16B#', 19.8),
  channel('18A#', 20.2), channel('18B#', 23.0),
  channel('20A#', 22.6), channel('20B#', 25.8),
  channel('24A#', 26.9), channel('24B#', 30.6),
  channel('30A#', 34.5), channel('30B#', 39.2),
  channel('40A#', 58.9), channel('40B#', 65.2),
  channel('22A#', 25.0), channel('22B#', 28.5), channel('24C#', 34.4),
  channel('25A#', 27.4), channel('25B#', 31.3), channel('25C#', 35.3),
  channel('27A#', 30.8), channel('27B#', 35.1), channel('27C#', 39.3),
  channel('28A#', 31.4), channel('28B#', 35.8), channel('28C#', 40.2),
  channel('30C#', 43.9), channel('32A#', 38.1), channel('32B#', 43.1), channel('32C#', 48.1),
  channel('36A#', 47.8), channel('36B#', 53.5), channel('36C#', 59.1), channel('40C#', 71.5),
  ibeam('10#', 11.3), ibeam('12#', 14.0), ibeam('12.6#', 14.2),
  ibeam('14#', 16.9), ibeam('16#', 20.5), ibeam('18#', 24.1),
  ibeam('20A#', 27.9), ibeam('20B#', 31.1),
  ibeam('24A#', 37.5), ibeam('24B#', 41.2),
  ibeam('30A#', 48.1), ibeam('30B#', 52.8),
  ibeam('40A#', 67.6), ibeam('40B#', 73.8),
  ibeam('50A#', 93.6), ibeam('50B#', 101),
  ibeam('63A#', 121), ibeam('63B#', 131),
  ibeam('22A#', 33.1), ibeam('22B#', 36.5), ibeam('25A#', 38.1), ibeam('25B#', 42.0),
  ibeam('27A#', 42.8), ibeam('27B#', 47.0), ibeam('28A#', 43.5), ibeam('28B#', 47.9),
  ibeam('30C#', 57.5), ibeam('32A#', 52.7), ibeam('32B#', 57.7), ibeam('32C#', 62.7),
  ibeam('36A#', 60.0), ibeam('36B#', 65.7), ibeam('36C#', 71.3),
  ibeam('40C#', 80.1), ibeam('45A#', 80.4), ibeam('45B#', 87.4), ibeam('45C#', 94.5),
  ibeam('50C#', 109), ibeam('55A#', 105), ibeam('55B#', 114), ibeam('55C#', 123),
  ibeam('56A#', 106), ibeam('56B#', 115), ibeam('56C#', 124), ibeam('63C#', 141),
  hbeam('H100*100*6*8', 16.9, 6, 'HW100*100'),
  hbeam('H150*150*7*10', 31.1, 7, 'HW150*150'),
  hbeam('H200*200*8*12', 49.9, 8, 'HW200*200'),
  hbeam('H250*250*9*14', 71.8, 9, 'HW250*250'),
  hbeam('H300*300*10*15', 93.0, 10, 'HW300*300'),
  hbeam('H350*350*12*19', 135, 12, 'HW350*350'),
  hbeam('H200*152*8*12', 40.1, 8, 'HM200*150'),
  hbeam('H300*202*10*15', 69.9, 10, 'HM300*200'),
  hbeam('H400*200*8*13', 65.4, 8, 'HN400*200'),
  hbeam('H200*100*5.5*8', 20.9, 5.5, 'HN200*100'),
  hbeam('H250*125*6*9', 29.0, 6, 'HN250*125'),
  hbeam('H300*150*6.5*9', 36.7, 6.5, 'HN300*150'),
  hbeam('H350*175*7*11', 49.4, 7, 'HN350*175'),
  cpurlin('C60*30*10*2.5', 2.363), cpurlin('C60*30*10*3', 2.743),
  cpurlin('C80*40*15*2', 2.72),
  cpurlin('C100*50*15*2.5', 4.11), cpurlin('C100*50*20*2.5', 4.325), cpurlin('C100*50*20*3', 5.098),
  cpurlin('C120*50*20*2.5', 4.70), cpurlin('C120*60*20*3', 6.01),
  cpurlin('C140*50*20*2', 4.14), cpurlin('C140*50*20*2.5', 5.09), cpurlin('C140*60*20*2.5', 5.503), cpurlin('C140*60*20*3', 6.511),
  cpurlin('C160*60*20*2', 4.76), cpurlin('C160*60*20*2.5', 5.87), cpurlin('C160*70*20*3', 7.42),
  cpurlin('C180*60*20*3', 7.453), cpurlin('C180*70*20*3', 7.924),
  cpurlin('C200*60*20*3', 7.924), cpurlin('C200*70*20*2.5', 7.05), cpurlin('C200*70*20*3', 8.395),
  cpurlin('C220*75*20*2', 6.18), cpurlin('C220*75*20*2.5', 7.64),
  cpurlin('C250*40*15*3', 7.924),
  { shape: 'aluminum', model: 'NFS5-2020', aliases: ['2020'], kgPerM: 0.50, source: MISUMI_20_40 },
  { shape: 'aluminum', model: 'NFS6-3030', aliases: ['3030'], kgPerM: 0.80, source: MISUMI_30 },
  { shape: 'aluminum', model: 'NFS5-4040', aliases: ['4040'], kgPerM: 1.28, source: MISUMI_20_40 },
]

// TODO: 待核实（来源：GB/T 11263-2024 表A.1）：以上未列出的 HW/HM/HN 规格，尤其非基准厚度。
// TODO: 待核实（来源：GB/T 6723-2017 及现行替代标准）：以上未列出的 C80–C250 厚度档。
// TODO: 待核实（来源：GB/T 706-2016 表A.2/A.3）：其余未列出的角钢、槽钢规格。
// TODO: 待核实（来源：米思米铝型材官方目录）：20/30/40 系列其他截面与壁厚，不可套用已录入型号的线重。

export function normalizeModel(value: string): string {
  let model = String(value || '').normalize('NFKC').toUpperCase().replace(/\s+/g, '')
  model = model.replace(/[×X]/g, '*').replace(/^∠/, '').replace(/^L(?=\d+\*)/, '')
  return model
}

export function lookupSpec(shape: SectionShape, model: string): SpecRow | null {
  const key = normalizeModel(model)
  if (!key) return null
  return SPEC_TABLE.find(row => row.shape === shape &&
    [row.model, ...row.aliases].some(candidate => normalizeModel(candidate) === key)) || null
}
