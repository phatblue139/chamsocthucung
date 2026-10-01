import './style.css'
import { initSiteHeader } from './siteHeader.js'

initSiteHeader()

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

const form = document.querySelector('#contactForm')
const note = document.querySelector('#formNote')
if (form && note) {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = form.name?.value?.trim()
    note.textContent = `Cảm ơn ${name || 'bạn'}! NEKO đã nhận được yêu cầu liên hệ và sẽ phản hồi sớm nhất. 🐾`
    form.reset()
  })
}
