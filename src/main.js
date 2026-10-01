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
    note.textContent = `Cảm ơn ${name || 'bạn'}! NEKO sẽ liên hệ lại sớm nhất để xác nhận lịch chăm sóc. 🐾`
    form.reset()
  })
}
