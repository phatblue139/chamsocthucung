import { initAdminUI } from './adminUI.js'

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/about.html', label: 'Giới thiệu' },
  { href: '/services.html', label: 'Dịch vụ' },
  { href: '/pricing.html', label: 'Bảng giá' },
]

const ROLE_ITEMS = [
  { href: '/user.html', label: 'Vào trang của tôi', className: 'user-link' },
  { href: '/src/careSchedules.html', label: 'Quản lý lịch', className: 'admin-link' },
]

const BOOKING_ITEM = { href: '/booking.html', label: 'Đặt lịch ngay' }

const AUTH_DIALOGS = `
  <dialog id="loginDialog" class="login-dialog">
    <form id="loginForm" novalidate>
      <h2>Đăng nhập</h2>

      <p class="login-sub">
        Đăng nhập để đặt lịch và theo dõi lịch chăm sóc.
      </p>

      <label for="loginUsername">
        Tên đăng nhập
      </label>

      <input
        type="text"
        id="loginUsername"
        name="username"
        placeholder="Nhập tên đăng nhập"
        autocomplete="username"
        required>

      <label for="loginPassword">
        Mật khẩu
      </label>

      <input
        type="password"
        id="loginPassword"
        name="password"
        placeholder="••••••"
        autocomplete="current-password"
        required>

      <p
        class="login-error"
        id="loginError"
        hidden>

        Sai tên đăng nhập hoặc mật khẩu!
      </p>

      <div class="login-actions">
        <button
          type="button"
          class="btn btn-outline"
          data-close-dialog>

          Hủy
        </button>

        <button
          type="submit"
          class="btn btn-primary">

          Đăng nhập
        </button>
      </div>
    </form>
  </dialog>

  <dialog id="registerDialog" class="login-dialog">
    <form id="registerForm" novalidate>
      <h2>Đăng ký tài khoản</h2>

      <p class="login-sub">
        Tạo tài khoản để đăng ký lịch chăm sóc cho thú cưng.
      </p>

      <label for="registerUsername">
        Tên đăng nhập
      </label>

      <input
        type="text"
        id="registerUsername"
        name="username"
        placeholder="Ví dụ: minh.an"
        autocomplete="username"
        required>

      <label for="registerFullName">
        Họ và tên
      </label>

      <input
        type="text"
        id="registerFullName"
        name="fullName"
        placeholder="Nguyễn Văn A"
        autocomplete="name"
        required>

      <label for="registerPhone">
        Số điện thoại
      </label>

      <input
        type="tel"
        id="registerPhone"
        name="phone"
        placeholder="090 123 4567"
        autocomplete="tel"
        required>

      <label for="registerPassword">
        Mật khẩu
      </label>

      <input
        type="password"
        id="registerPassword"
        name="password"
        placeholder="Ít nhất 6 ký tự"
        autocomplete="new-password"
        required>

      <label for="registerConfirmPassword">
        Xác nhận mật khẩu
      </label>

      <input
        type="password"
        id="registerConfirmPassword"
        name="confirmPassword"
        placeholder="Nhập lại mật khẩu"
        autocomplete="new-password"
        required>

      <p
        class="login-error"
        id="registerError"
        hidden>
      </p>

      <div class="login-actions">
        <button
          type="button"
          class="btn btn-outline"
          data-close-dialog>

          Hủy
        </button>

        <button
          type="submit"
          class="btn btn-primary">

          Tạo tài khoản
        </button>
      </div>
    </form>
  </dialog>
`

function currentPath() {
  const { pathname } = window.location

  if (pathname === '/' || pathname.endsWith('/index.html')) {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function renderNavLink({ href, label, className = '' }) {
  const classes = [className].filter(Boolean).join(' ')
  const isActive = currentPath() === href

  return `
        <a
          href="${href}"
          class="nav-link${classes ? ` ${classes}` : ''}${isActive ? ' active' : ''}"
          ${isActive ? 'aria-current="page"' : ''}>
          ${label}
        </a>`
}

function renderHeaderTemplate() {
  const navLinks = NAV_ITEMS.map(renderNavLink).join('\n')
  const roleLinks = ROLE_ITEMS.map(renderNavLink).join('\n')
  const isBookingActive = currentPath() === BOOKING_ITEM.href

  return `
  <header class="site-header">

    <div class="container header-inner">

      <a
        href="/"
        class="logo"
        aria-label="NEKO - Trang chủ">

        <span class="logo-mark">
          🐾
        </span>

        <span>
          NEKO<span class="logo-dot">.</span>
        </span>

      </a>

      <nav
        class="nav"
        id="nav"
        aria-label="Điều hướng chính">
${navLinks}

${roleLinks}

        <button
          type="button"
          class="nav-btn-login"
          id="loginBtn">
          Đăng nhập
        </button>

        <button
          type="button"
          class="nav-btn-register"
          id="registerBtn">
          Đăng ký
        </button>

        <a
          href="${BOOKING_ITEM.href}"
          class="btn btn-primary nav-cta${isBookingActive ? ' active' : ''}"
          ${isBookingActive ? 'aria-current="page"' : ''}>
          ${BOOKING_ITEM.label}
        </a>

        <button
          type="button"
          class="nav-btn-login nav-btn-logout"
          id="logoutBtn"
          hidden>
          Đăng xuất
        </button>

      </nav>

      <button
        class="nav-toggle"
        id="navToggle"
        aria-label="Mở menu"
        aria-expanded="false">

        <span></span>
        <span></span>
        <span></span>

      </button>

    </div>

  </header>
${AUTH_DIALOGS}`
}

function initMobileNav(root) {
  const nav = root.querySelector('#nav')
  const navToggle = root.querySelector('#navToggle')

  if (!nav || !navToggle) return

  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen)
    navToggle.classList.toggle('open', isOpen)
    navToggle.setAttribute('aria-expanded', String(isOpen))
  }

  navToggle.addEventListener('click', () => {
    setOpen(!nav.classList.contains('open'))
  })

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false))
  })
}

export function initSiteHeader() {
  const host = document.querySelector('[data-site-header]')

  if (!host || host.dataset.mounted === 'true') return

  host.dataset.mounted = 'true'
  host.innerHTML = renderHeaderTemplate()

  initMobileNav(host)
  initAdminUI()
}
