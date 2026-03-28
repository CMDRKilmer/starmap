import mineralsData from '../data/minerals_list.json'

const RESOURCE_NAME_MAP = {}
mineralsData.minerals.forEach(m => {
  RESOURCE_NAME_MAP[m.code] = m.name
})

export function getResourceName(ticker) {
  return RESOURCE_NAME_MAP[ticker] || ticker
}
