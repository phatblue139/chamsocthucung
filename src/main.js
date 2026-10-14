import './style.css'
import { navigateWithAuth } from './adminUI.js'
import { initSiteHeader } from './siteHeader.js'

initSiteHeader()

document.querySelectorAll('[data-booking-cta]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateWithAuth(link.getAttribute('href') || '/user.html')
  })
})

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = new Date().getFullYear()
