import './style.css'

const navToggle = document.querySelector('#navToggle')
const nav = document.querySelector('#nav')

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open')
    navToggle.classList.toggle('open', isOpen)
    navToggle.setAttribute('aria-expanded', String(isOpen))
  })

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open')
      navToggle.classList.remove('open')
      navToggle.setAttribute('aria-expanded', 'false')
    })
  })
}

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