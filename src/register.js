import './style.css'
import { initPageChrome } from './pageUI.js'
import { getCurrentRole, login, registerUser } from './auth.js'

initPageChrome()

const form = document.getElementById('registerForm')
const errorEl = document.getElementById('registerError')

// Đã đăng nhập rồi thì không cần đăng ký thêm.
if (getCurrentRole()) {
  window.location.replace('/')
}

function getField(name) {
  return form?.elements?.namedItem(name) || null
}

function setError(message) {
  if (!errorEl) return
  errorEl.textContent = message
  errorEl.hidden = false
}

form?.addEventListener('submit', (event) => {
  event.preventDefault()

  if (errorEl) errorEl.hidden = true

  const fullName = getField('fullName')?.value.trim() || ''
  const username = getField('username')?.value.trim() || ''
  const phone = getField('phone')?.value.trim() || ''
  const password = getField('password')?.value || ''
  const confirmPassword = getField('confirmPassword')?.value || ''

  if (!fullName || !username || !phone || !password) {
    setError('Vui lòng điền đầy đủ thông tin đăng ký.')
    return
  }

  if (password.length < 6) {
    setError('Mật khẩu phải có ít nhất 6 ký tự.')
    return
  }

  if (password !== confirmPassword) {
    setError('Mật khẩu xác nhận không khớp.')
    return
  }

  const result = registerUser({ fullName, username, phone, password })

  if (!result.success) {
    setError(result.error)
    return
  }

  if (!login(username, password)) {
    setError('Tài khoản đã tạo nhưng chưa đăng nhập được. Vui lòng thử đăng nhập lại.')
    return
  }

  // Đăng ký xong thì sang thẳng trang đặt lịch.
  window.location.href = '/booking.html'
})
