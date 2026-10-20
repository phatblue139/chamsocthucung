import './style.css'
import { navigateWithAuth } from './adminUI.js'
import { initSiteHeader } from './siteHeader.js'
import { formatCurrency, SERVICE_CATALOG } from './careScheduleData.js'

initSiteHeader()

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-booking-cta]')
  if (!link) return

  event.preventDefault()
  navigateWithAuth(link.getAttribute('href') || '/user.html')
})

function getPriceLabel(service) {
  if (Number.isFinite(service.price)) {
    return `${formatCurrency(service.price)}/${service.unit || 'lần'}`
  }
  return `${formatCurrency(service.hourlyRate)}/giờ · tối đa ${formatCurrency(service.dailyRate)}/ngày`
}

function renderPriceCatalog(container) {
  SERVICE_CATALOG.filter((service) => service.active).forEach((service) => {
    const card = document.createElement('article')
    card.className = 'price-card catalog-service-card'

    const title = document.createElement('h3')
    title.textContent = `${service.icon} ${service.name}`
    const price = document.createElement('p')
    price.className = 'price'
    price.textContent = getPriceLabel(service)
    const description = document.createElement('p')
    description.className = 'section-desc'
    description.textContent = service.description
    const link = document.createElement('a')
    link.href = '/user.html#userScheduleForm'
    link.dataset.bookingCta = 'true'
    link.className = 'btn btn-outline'
    link.textContent = 'Đặt dịch vụ'

    card.append(title, price, description, link)
    container.appendChild(card)
  })
}

document.querySelectorAll('[data-service-catalog]').forEach(renderPriceCatalog)
document.querySelectorAll('[data-service-code]').forEach((card) => {
  const service = SERVICE_CATALOG.find((item) => item.id === card.dataset.serviceCode && item.active)
  if (!service) return

  const price = document.createElement('p')
  price.className = 'service-price'
  price.textContent = getPriceLabel(service)
  card.appendChild(price)
})

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = new Date().getFullYear()
