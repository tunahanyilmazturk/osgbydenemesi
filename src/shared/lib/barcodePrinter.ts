export function sendToBarcodePrinter(values: string[]) {
  const params = values.map(encodeURIComponent).join(encodeURIComponent('|'))
  const link = document.createElement('a')
  link.href = `infoMedBarkodPrinter:${params}`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
