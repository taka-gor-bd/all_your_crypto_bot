// Telegram Web App Integration
class TelegramApp {
  constructor() {
    this.tg = window.Telegram?.WebApp
    this.user = null
    this.isReady = false
    this.init()
  }

  init() {
    if (this.tg) {
      this.tg.ready()
      this.tg.expand()
      this.user = this.tg.initDataUnsafe?.user
      this.isReady = true

      // Set theme
      document.documentElement.setAttribute("data-theme", this.tg.colorScheme)

      // Handle back button
      this.tg.BackButton.onClick(() => {
        this.goBack()
      })
    } else {
      // Fallback for non-Telegram browsers
      this.handleNonTelegramAccess()
    }
  }

  // Check if running in Telegram
  isTelegram() {
    return this.tg && this.user
  }

  // Get user data
  getUserData() {
    return this.user
  }

  // Show main button
  showMainButton(text, callback) {
    if (this.tg) {
      this.tg.MainButton.setText(text)
      this.tg.MainButton.show()
      this.tg.MainButton.onClick(callback)
    }
  }

  // Hide main button
  hideMainButton() {
    if (this.tg) {
      this.tg.MainButton.hide()
    }
  }

  // Show back button
  showBackButton() {
    if (this.tg) {
      this.tg.BackButton.show()
    }
  }

  // Hide back button
  hideBackButton() {
    if (this.tg) {
      this.tg.BackButton.hide()
    }
  }

  // Go back
  goBack() {
    window.history.back()
  }

  // Haptic feedback
  hapticFeedback(type = "light") {
    if (this.tg?.HapticFeedback) {
      this.tg.HapticFeedback.impactOccurred(type)
    }
  }

  // Show alert
  showAlert(message) {
    if (this.tg) {
      this.tg.showAlert(message)
    } else {
      alert(message)
    }
  }

  // Show confirm
  showConfirm(message, callback) {
    if (this.tg) {
      this.tg.showConfirm(message, callback)
    } else {
      const result = confirm(message)
      callback(result)
    }
  }

  // Handle non-Telegram access
  handleNonTelegramAccess() {
    // Show login modal for non-Telegram users
    const loginModal = document.createElement("div")
    loginModal.className = "login-modal"
    loginModal.innerHTML = `
            <div class="login-modal-content">
                <h3>অ্যাকাউন্ট তৈরি করুন</h3>
                <p>এই অ্যাপটি Telegram এর জন্য তৈরি। Telegram ছাড়া ব্যবহার করতে অ্যাকাউন্ট তৈরি করুন।</p>
                <form id="loginForm">
                    <input type="text" id="username" placeholder="ইউজারনেম" required>
                    <input type="text" id="firstName" placeholder="নাম" required>
                    <input type="email" id="email" placeholder="ইমেইল (ঐচ্ছিক)">
                    <button type="submit">অ্যাকাউন্ট তৈরি করুন</button>
                </form>
                <p><a href="https://t.me/all_your_crypto_bot" target="_blank">Telegram এ যান</a></p>
            </div>
        `

    document.body.appendChild(loginModal)

    document.getElementById("loginForm").addEventListener("submit", (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      this.createNonTelegramUser({
        username: formData.get("username"),
        first_name: formData.get("firstName"),
        email: formData.get("email"),
        id: "web_" + Date.now(),
      })
      loginModal.remove()
    })
  }

  // Create user for non-Telegram access
  async createNonTelegramUser(userData) {
    this.user = userData
    localStorage.setItem("non_telegram_user", JSON.stringify(userData))

    // Initialize user in database
    const referralCode = new URLSearchParams(window.location.search).get("ref") || ""
    await window.db.createUser(userData, referralCode)

    // Reload app
    window.location.reload()
  }

  // Load non-Telegram user
  loadNonTelegramUser() {
    const stored = localStorage.getItem("non_telegram_user")
    if (stored) {
      this.user = JSON.parse(stored)
      return true
    }
    return false
  }
}

// Initialize Telegram App
window.telegramApp = new TelegramApp()
