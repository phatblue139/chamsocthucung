import './style.css'
import { initPageChrome } from './pageUI.js'
import { initAdminUI } from './adminUI.js'

initPageChrome()

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

initAdminUI()
