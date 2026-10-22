import './style.css'
import { navigateWithAuth } from './adminUI.js'
import { initSiteHeader } from './siteHeader.js'
import { formatCurrency, SERVICE_CATALOG } from './careScheduleData.js'
import { loadReviews, REVIEW_STORAGE_KEY } from './reviewData.js'

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
  if (Array.isArray(service.cageTypes) && service.cageTypes.length) {
    const fees = service.cageTypes
      .map((cage) => `${cage.label.replace('Chuồng ', '')} ${formatCurrency(cage.fee)}`)
      .join(' · ')
    return `${formatCurrency(service.hourlyRate)}/giờ · tối đa ${formatCurrency(service.dailyRate)}/ngày + phí chuồng: ${fees}`
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

function renderHomeReviews() {
  const list = document.querySelector('#homeReviewList')
  const empty = document.querySelector('#homeReviewEmpty')
  const summary = document.querySelector('#homeReviewSummary')
  if (!list || !empty || !summary) return

  const reviews = loadReviews()
    .filter((review) =>
      Number.isInteger(review.rating) &&
      review.rating >= 1 &&
      review.rating <= 5 &&
      review.comment,
    )
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))

  list.replaceChildren()
  empty.hidden = reviews.length > 0
  summary.hidden = reviews.length === 0
  if (!reviews.length) return

  const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
  const averageStars = document.querySelector('#homeReviewAverageStars')
  const averageValue = document.querySelector('#homeReviewAverage')
  const reviewCount = document.querySelector('#homeReviewCount')
  averageStars.textContent = `${'★'.repeat(Math.round(average))}${'☆'.repeat(5 - Math.round(average))}`
  averageStars.setAttribute('aria-label', `${average.toFixed(1)} trên 5 sao`)
  averageValue.textContent = average.toFixed(1)
  reviewCount.textContent = `${reviews.length} đánh giá`

  reviews.slice(0, 6).forEach((review) => {
    const card = document.createElement('article')
    card.className = 'testi-card home-review-card'

    const stars = document.createElement('div')
    stars.className = 'testi-stars'
    stars.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`
    stars.setAttribute('aria-label', `${review.rating} trên 5 sao`)

    const comment = document.createElement('p')
    comment.className = 'home-review-comment'
    comment.textContent = review.comment

    const author = document.createElement('div')
    author.className = 'testi-user'
    const avatar = document.createElement('div')
    avatar.className = 'testi-avatar'
    avatar.setAttribute('aria-hidden', 'true')
    avatar.textContent = '🐾'
    const details = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = review.authorName || 'Khách hàng NEKO'
    const service = document.createElement('em')
    service.textContent = `${review.petName || 'Thú cưng'} · ${review.careType || 'Chăm sóc'}`
    details.append(name, service)
    author.append(avatar, details)
    card.append(stars, comment, author)
    list.appendChild(card)
  })
}

window.addEventListener('storage', (event) => {
  if (event.key === REVIEW_STORAGE_KEY || event.key === null) renderHomeReviews()
})

renderHomeReviews()

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = new Date().getFullYear()
