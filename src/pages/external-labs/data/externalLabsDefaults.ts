import type { ExternalLab } from '@/shared/types'

export const defaultExternalLabs: ExternalLab[] = [
  {
    id: 1,
    active: true,
    name: 'Çetka Tarama',
    institutionCode: '0',
    username: 'cetkatanama',
    webServiceAddress: 'http://185.97.119.102:8085/WebService/Dolphin.asmx',
    type: 'Kocaeli Sistem Lab (Dolphin)',
  },
  {
    id: 2,
    active: false,
    name: 'Gebze Sistem Lab',
    institutionCode: '02',
    username: 'CETKA',
    webServiceAddress: 'http://185.103.154.90/WebService/Dolphin.asmx',
    type: 'Gebze Sistem Lab (Dolphin)',
  },
  {
    id: 3,
    active: true,
    name: 'İZMİR RAPORLAMA',
    institutionCode: '87',
    username: 'cetka osgb',
    webServiceAddress: 'https://gesraporlama.infomed.com.tr/',
    type: 'OSGB Raporlama (InfoMED Service)',
  },
  {
    id: 4,
    active: true,
    name: 'Kocaeli Sistem LAB',
    institutionCode: '0',
    username: 'CETKA',
    webServiceAddress: 'http://185.97.119.102:8085/WebService/Dolphin.asmx',
    type: 'Kocaeli Sistem Lab (Dolphin)',
  },
  {
    id: 5,
    active: false,
    name: 'DR NEY',
    institutionCode: '78',
    username: 'cetka osgb',
    webServiceAddress: 'https://drneyraporlama.infomed.com.tr/',
    type: 'DR NEY (InfoMED Service)',
  },
]
