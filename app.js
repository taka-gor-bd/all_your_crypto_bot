// Main Application Logic
class App {
  constructor() {
    this.currentUser = null
    this.settings = null
    this.adTimer = null
    this.init()
  }

  async init() {
    try {
      // Load settings
      this.settings = await window.db.getSettings()
      this.applySettings()

      // Initialize user
      await this.initializeUser()

      // Load user data
      await this.loadUserData()

      // Load tasks
      await this.loadTasks()

      // Setup ad system
      this.setupAdSystem()

      // Setup auto refresh
      this.setupAutoRefresh()

      // Hide loading
      document.getElementById("loadingOverlay").style.display = "none"
    } catch (error) {
      console.error("App initialization error:", error)
      this.showMessage("অ্যাপ লোড করতে সমস্যা হয়েছে", "error")
    }
  }

  // Apply settings to UI
  applySettings() {
    if (!this.settings) return

    // Update app name
    document.getElementById("appName").textContent = this.settings.app_config.app_name
    document.title = this.settings.app_config.app_name

    // Update coin name
    document.getElementById("coinName").textContent = this.settings.app_config.coin_name

    // Apply theme colors
    const root = document.documentElement
    root.style.setProperty("--primary-color", this.settings.design.primary_color)
    root.style.setProperty("--secondary-color", this.settings.design.secondary_color)
    root.style.setProperty("--accent-color", this.settings.design.accent_color)
    root.style.setProperty("--background-color", this.settings.design.background_color)
    root.style.setProperty("--text-color", this.settings.design.text_color)
    root.style.setProperty("--gradient-primary", this.settings.design.header_gradient)
  }

  // Initialize user (Telegram or web)
  async initializeUser() {
    let userData = null

    if (window.telegramApp.isTelegram()) {
      userData = window.telegramApp.getUserData()
    } else {
      // Try to load existing web user
      if (!window.telegramApp.loadNonTelegramUser()) {
        // Will show login modal
        return
      }
      userData = window.telegramApp.getUserData()
    }

    // Get or create user in database
    this.currentUser = await window.db.getUser(userData.id)

    if (!this.currentUser) {
      // Check for referral code in URL
      const urlParams = new URLSearchParams(window.location.search)
      const referralCode = urlParams.get("ref") || ""

      this.currentUser = await window.db.createUser(userData, referralCode)
    }

    // Update last active
    await window.db.updateCoins(userData.id, 0) // This updates last_active
  }

  // Load user data and update UI
  async loadUserData() {
    if (!this.currentUser) return

    // Update user info
    document.getElementById("userName").textContent = this.currentUser.personal_info.first_name || "ব্যবহারকারী"
    document.getElementById("userStatus").textContent = `@${this.currentUser.personal_info.username || "user"}`

    // Show premium badge if applicable
    if (this.currentUser.personal_info.is_premium || this.currentUser.personal_info.blue_tick) {
      document.getElementById("premiumBadge").style.display = "block"
    }

    // Update balance
    document.getElementById("totalBalance").textContent = this.formatNumber(this.currentUser.wallet.total_coins)
    document.getElementById("todayEarning").textContent = this.formatNumber(this.currentUser.wallet.today_earned)
    document.getElementById("adsWatched").textContent = this.currentUser.wallet.ads_watched_today

    // Update referral stats
    document.getElementById("totalReferrals").textContent = this.currentUser.referral_data.total_referrals
    document.getElementById("referralEarnings").textContent = this.formatNumber(
      this.currentUser.referral_data.referral_earnings,
    )
    document.getElementById("totalRefs").textContent = this.currentUser.referral_data.total_referrals
    document.getElementById("activeRefs").textContent = this.currentUser.referral_data.active_referrals

    // Setup referral link
    const referralLink = window.db.getReferralLink(this.currentUser.referral_data.referral_code)
    document.getElementById("referralLink").value = referralLink

    // Show referral code input if user can set referrer
    if (this.currentUser.referral_data.can_set_referrer) {
      document.getElementById("referralCodeSection").style.display = "block"
    }
  }

  // Load tasks
  async loadTasks() {
    const tasks = await window.db.loadData("tasks.json")
    if (!tasks) return

    const taskList = document.getElementById("taskList")
    taskList.innerHTML = ""

    let completedTasks = 0

    tasks.daily_tasks.forEach((task) => {
      const isCompleted = this.isTaskCompleted(task.id)
      if (isCompleted) completedTasks++

      const taskElement = document.createElement("div")
      taskElement.className = "task-item"
      taskElement.innerHTML = `
                <div class="task-info">
                    <div class="task-icon">${task.icon}</div>
                    <div class="task-details">
                        <h4>${task.title}</h4>
                        <p>${task.description}</p>
                    </div>
                </div>
                <div class="task-reward">
                    ${isCompleted ? "সম্পন্ন" : `+${task.reward}`}
                </div>
            `

      if (!isCompleted) {
        taskElement.style.cursor = "pointer"
        taskElement.onclick = () => this.completeTask(task)
      } else {
        taskElement.style.opacity = "0.6"
      }

      taskList.appendChild(taskElement)
    })

    document.getElementById("dailyProgress").textContent = `${completedTasks}/${tasks.daily_tasks.length}`
  }

  // Check if task is completed
  isTaskCompleted(taskId) {
    if (!this.currentUser) return false

    if (taskId === "daily_bonus") {
      return this.currentUser.activity.daily_bonus_claimed
    } else if (taskId === "watch_ads") {
      return this.currentUser.wallet.ads_watched_today >= 10 // Example limit
    }

    return this.currentUser.activity.tasks_completed.includes(taskId)
  }

  // Complete task
  async completeTask(task) {
    if (this.isTaskCompleted(task.id)) return

    if (task.id === "daily_bonus") {
      await this.claimDailyBonus()
    } else if (task.id === "watch_ads") {
      await this.watchAd()
    } else if (task.id === "invite_friends") {
      this.showTab("referral")
    }
  }

  // Claim daily bonus
  async claimDailyBonus() {
    if (this.currentUser.activity.daily_bonus_claimed) {
      this.showMessage("আজকের বোনাস ইতিমধ্যে নেওয়া হয়েছে", "error")
      return
    }

    const bonus = this.settings.earning_config.daily_bonus
    await window.db.updateCoins(this.currentUser.personal_info.telegram_id, bonus)

    // Update user data
    this.currentUser.activity.daily_bonus_claimed = true
    this.currentUser.wallet.total_coins += bonus
    this.currentUser.wallet.today_earned += bonus

    this.showMessage(`দৈনিক বোনাস পেয়েছেন: +${bonus} কয়েন`, "success")
    await this.loadUserData()
    await this.loadTasks()

    // Haptic feedback
    window.telegramApp.hapticFeedback("medium")
  }

  // Watch ad
  async watchAd() {
    if (this.currentUser.wallet.ads_watched_today >= this.settings.earning_config.daily_ad_limit) {
      this.showMessage("আজকের বিজ্ঞাপন সীমা শেষ", "error")
      return
    }

    try {
      // Use smart ad system
      const success = await window.adSystem.showSmartAd("manual", "interstitial")

      if (success) {
        // Ad system handles reward automatically
        await this.loadUserData()
        await this.loadTasks()

        // Haptic feedback
        window.telegramApp.hapticFeedback("medium")
      }
    } catch (error) {
      console.error("Ad error:", error)
      this.showMessage("বিজ্ঞাপন লোড করতে সমস্যা হয়েছে", "error")
    }
  }

  // Setup ad system
  setupAdSystem() {
    if (!this.settings.ad_config.show_ads) return

    // Smart ad system is already initialized in ads.js
    // Just update settings
    window.adSystem.updateAdSettings(this.settings.ad_config)

    // Add watch ad button functionality
    const watchAdButtons = document.querySelectorAll('[onclick*="watchAd"]')
    watchAdButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault()
        await this.watchAd()
      })
    })
  }

  // Show automatic ad
  async showAutoAd() {
    try {
      const show_9709495 = window.monetag.showAd // Declare the variable here
      await show_9709495("pop")
      // Small reward for auto ads
      const reward = Math.floor(this.settings.earning_config.ad_reward / 2)
      await window.db.updateCoins(this.currentUser.personal_info.telegram_id, reward)
      this.currentUser.wallet.total_coins += reward
      await this.loadUserData()
    } catch (error) {
      // User closed ad or error occurred
    }
  }

  // Setup auto refresh
  setupAutoRefresh() {
    setInterval(async () => {
      if (this.currentUser) {
        const updatedUser = await window.db.getUser(this.currentUser.personal_info.telegram_id)
        if (updatedUser) {
          this.currentUser = updatedUser
          await this.loadUserData()
        }
      }
    }, 30000) // Refresh every 30 seconds
  }

  // Apply referral code
  async applyReferralCode() {
    const code = document.getElementById("referralCodeInput").value.trim()
    if (!code) {
      this.showMessage("রেফারেল কোড লিখুন", "error")
      return
    }

    if (!this.currentUser.referral_data.can_set_referrer) {
      this.showMessage("আপনি ইতিমধ্যে একটি রেফারেল কোড ব্যবহার করেছেন", "error")
      return
    }

    // Process referral
    await window.db.processReferral(code, `user_${this.currentUser.personal_info.telegram_id}`)

    // Update user
    this.currentUser.referral_data.referred_by = code
    this.currentUser.referral_data.can_set_referrer = false

    document.getElementById("referralCodeSection").style.display = "none"
    this.showMessage("রেফারেল কোড সফলভাবে ব্যবহার করা হয়েছে!", "success")

    await this.loadUserData()
  }

  // Copy referral link
  copyReferralLink() {
    const link = document.getElementById("referralLink")
    link.select()
    document.execCommand("copy")
    this.showMessage("রেফারেল লিংক কপি করা হয়েছে!", "success")
    window.telegramApp.hapticFeedback("light")
  }

  // Share to Telegram
  shareToTelegram() {
    const link = document.getElementById("referralLink").value
    const text = `🎉 ${this.settings.app_config.app_name} এ যোগ দিন এবং ${this.settings.app_config.coin_name} কয়েন আয় করুন!\n\n💰 প্রতিদিন ফ্রি কয়েন পান\n🎁 রেফারেল বোনাস পান\n💸 সহজেই টাকা উইথড্র করুন\n\n👇 এই লিংকে ক্লিক করুন:\n${link}`

    if (window.telegramApp.isTelegram()) {
      window.telegramApp.tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
      )
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank")
    }
  }

  // Share referral link
  shareReferralLink() {
    const link = document.getElementById("referralLink").value
    if (navigator.share) {
      navigator.share({
        title: this.settings.app_config.app_name,
        text: `${this.settings.app_config.app_name} এ যোগ দিন এবং কয়েন আয় করুন!`,
        url: link,
      })
    } else {
      this.copyReferralLink()
    }
  }

  // Request withdrawal
  async requestWithdrawal() {
    const method = document.getElementById("withdrawMethod").value
    const account = document.getElementById("accountNumber").value.trim()
    const amount = Number.parseInt(document.getElementById("withdrawAmount").value)

    if (!account) {
      this.showMessage("অ্যাকাউন্ট নম্বর লিখুন", "error")
      return
    }

    if (!amount || amount < this.settings.earning_config.min_withdrawal) {
      this.showMessage(`সর্বনিম্ন উইথড্র পরিমাণ: ${this.settings.earning_config.min_withdrawal}`, "error")
      return
    }

    if (amount > this.currentUser.wallet.total_coins) {
      this.showMessage("অপর্যাপ্ত ব্যালেন্স", "error")
      return
    }

    const result = await window.db.createWithdrawalRequest(
      this.currentUser.personal_info.telegram_id,
      amount,
      method,
      account,
    )

    if (result.success) {
      this.showMessage("উইথড্র রিকুয়েস্ট সফল! শীঘ্রই প্রক্রিয়া করা হবে", "success")
      document.getElementById("withdrawAmount").value = ""
      document.getElementById("accountNumber").value = ""
      await this.loadUserData()
    } else {
      this.showMessage(result.message, "error")
    }
  }

  // Subscribe to premium
  subscribeToPremium() {
    const price = this.settings.subscription.blue_tick_price
    if (this.currentUser.wallet.total_coins < price) {
      this.showMessage(`প্রিমিয়াম সাবস্ক্রিপশনের জন্য ${price} কয়েন প্রয়োজন`, "error")
      return
    }

    window.telegramApp.showConfirm(`${price} কয়েন দিয়ে প্রিমিয়াম সাবস্ক্রিপশন কিনবেন?`, async (confirmed) => {
      if (confirmed) {
        await window.db.updateCoins(this.currentUser.personal_info.telegram_id, price, "subtract")
        this.currentUser.personal_info.is_premium = true
        this.currentUser.wallet.total_coins -= price
        this.showMessage("প্রিমিয়াম সাবস্ক্রিপশন সফল!", "success")
        await this.loadUserData()
      }
    })
  }

  // Request blue tick
  requestBlueTick() {
    this.showMessage("ব্লু টিক ভেরিফিকেশনের জন্য অ্যাডমিনের কাছে রিকুয়েস্ট পাঠানো হয়েছে", "success")
  }

  // Save settings
  saveSettings() {
    const language = document.getElementById("languageSelect").value
    const theme = document.getElementById("themeSelect").value
    const notifications = document.getElementById("notificationsToggle").checked

    // Update user settings
    this.currentUser.settings.language = language
    this.currentUser.settings.theme = theme
    this.currentUser.settings.notifications = notifications

    this.showMessage("সেটিংস সেভ করা হয়েছে", "success")
  }

  // Format number with commas
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Show message
  showMessage(text, type = "success") {
    const message = document.createElement("div")
    message.className = `message message-${type}`
    message.textContent = text
    message.style.position = "fixed"
    message.style.top = "20px"
    message.style.left = "50%"
    message.style.transform = "translateX(-50%)"
    message.style.zIndex = "10000"
    message.style.maxWidth = "90%"

    document.body.appendChild(message)

    setTimeout(() => {
      message.remove()
    }, 3000)
  }
}

// Tab management
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.style.display = "none"
  })

  // Remove active class from all nav tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Show selected tab
  document.getElementById(tabName + "Tab").style.display = "block"

  // Add active class to clicked nav tab
  event.target.classList.add("active")

  // Haptic feedback
  window.telegramApp.hapticFeedback("light")
}

// Global functions for onclick handlers
window.showTab = showTab
window.applyReferralCode = () => window.app.applyReferralCode()
window.copyReferralLink = () => window.app.copyReferralLink()
window.shareToTelegram = () => window.app.shareToTelegram()
window.shareReferralLink = () => window.app.shareReferralLink()
window.requestWithdrawal = () => window.app.requestWithdrawal()
window.subscribeToPremium = () => window.app.subscribeToPremium()
window.requestBlueTick = () => window.app.requestBlueTick()
window.saveSettings = () => window.app.saveSettings()

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App()
})
