import './style.css'
import { initPageChrome } from './pageUI.js'
import { initAdminUI } from './adminUI.js'
import { getCurrentRole, getCurrentUser } from './auth.js'
import { loadSchedules, saveSchedules } from './careScheduleData.js'

// Trang này chỉ dành cho khách đã đăng nhập.
if (getCurrentRole() !== 'user') {
  location.replace('/')
  throw new Error('Vui lòng đăng nhập để đặt lịch')
}

const CARE_TYPES = [
  'Cho ăn',
  'Tắm',
  'Đi dạo',
  'Tiêm phòng',
  'Cắt móng',
  'Khám sức khỏe',
]

// Menu dùng chung logic với các trang khác để các mục giữ nguyên vị trí.
initAdminUI()
initPageChrome()

const currentUser = getCurrentUser()
const greeting = document.querySelector('[data-user-greeting]')
if (greeting && currentUser) greeting.textContent = currentUser.fullName

const form = document.getElementById('bookingForm')
const list = document.getElementById('bookingList')
const emptyMsg = document.getElementById('bookingEmpty')
const countEl = document.getElementById('bookingCount')
const message = document.getElementById('bookingMessage')

const petNameInput = document.getElementById('bookingPetName')
const careTypeInput = document.getElementById('bookingCareType')
const dateInput = document.getElementById('bookingDate')
const timeInput = document.getElementById('bookingTime')
const noteInput = document.getElementById('bookingNote')

if (careTypeInput && !careTypeInput.options.length) {
  CARE_TYPES.forEach((type) => {
    const option = document.createElement('option')
    option.value = type
    option.textContent = type
    careTypeInput.appendChild(option)
  })
}

function nextId(schedules) {
  const ids = schedules.map((item) => Number(item.id)).filter((id) => Number.isFinite(id))
  return ids.length > 0 ? Math.max(...ids) + 1 : 1
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-')
  return year && month && day ? `${day}/${month}/${year}` : value || ''
}

function getUserBookings() {
  if (!currentUser) return []

  return loadSchedules()
    .filter((item) => item.customerUsername === currentUser.username)
    .sort((a, b) => {
      const byDate = String(b.date || '').localeCompare(String(a.date || ''))
      if (byDate !== 0) return byDate
      return String(b.time || '').localeCompare(String(a.time || ''))
    })
}

function render() {
  const bookings = getUserBookings()

  if (countEl) countEl.textContent = bookings.length > 0 ? `${bookings.length} lịch` : ''

  if (list) {
    list.innerHTML = ''
    bookings.forEach((booking) => {
      const item = document.createElement('li')
      item.className = 'booking-item'
      item.innerHTML = `
        <div class="booking-item-main">
          <strong>${escapeHtml(booking.petName)}</strong>
          <span>${escapeHtml(booking.careType)}</span>
        </div>
        <div class="booking-item-meta">
          <span>${escapeHtml(formatDate(booking.date))}</span>
          <span>${escapeHtml(booking.time || '')}</span>
          <span class="booking-status">${escapeHtml(booking.status || 'Chờ xác nhận')}</span>
        </div>
        ${booking.note ? `<p class="booking-item-note">${escapeHtml(booking.note)}</p>` : ''}
      `
      list.appendChild(item)
    })
  }

  if (emptyMsg) emptyMsg.hidden = bookings.length > 0
}

function setMessage(text, isError = false) {
  if (!message) return
  message.textContent = text
  message.classList.toggle('booking-message-error', isError)
}

form?.addEventListener('submit', (event) => {
  event.preventDefault()

  if (!currentUser) {
    setMessage('Bạn cần đăng nhập để đặt lịch.', true)
    return
  }

  const petName = petNameInput?.value.trim() || ''
  const careType = careTypeInput?.value || ''
  const date = dateInput?.value || ''
  const time = timeInput?.value || ''
  const note = noteInput?.value.trim() || ''

  if (!petName || !careType || !date || !time) {
    setMessage('Vui lòng điền đầy đủ thông tin đặt lịch.', true)
    return
  }

  const schedules = loadSchedules()
  schedules.push({
    id: nextId(schedules),
    petId: schedules.length + 1,
    petName,
    careType,
    date,
    time,
    note,
    customerUsername: currentUser.username,
    customerName: currentUser.fullName,
    customerPhone: currentUser.phone,
    status: 'Chờ xác nhận',
    source: 'user',
  })
  saveSchedules(schedules)

  form.reset()
  setMessage(`Đã gửi yêu cầu đặt lịch cho ${petName}. NEKO sẽ gọi lại để xác nhận. 🐾`)
  render()
})

render()
