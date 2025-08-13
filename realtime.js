// Real-time Features and Final Polish
class RealTimeManager {
  constructor() {
    this.updateInterval = null
    this.notificationQueue = []
    this.isOnline = navigator.onLine
    this.lastUpdate = Date.now()
    this.init()
  }

  init() {
    // Start real-time updates
    this.startRealTimeUpdates()

    // Setup online/offline detection
    this.setupNetworkDetection()

    // Setup notification system
    this.setupNotificationSystem()

    // Setup auto-save
    this.setupAutoSave()

    // Setup performance monitoring
    this.setupPerformanceMonitoring()
  }

  // Real-time data updates every 30 seconds
  startRealTimeUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateUserData()
        await this.updateReferralData()
        await this.updateAdStats()
        await this.checkForNotifications()
        this.lastUpdate = Date.now()
      } catch (error) {
        console.error("Real-time update error:", error)
      }
    }, 30000) // 30 seconds
  }

  async updateUserData() {
    const userId = window.getCurrentUserId()
    if (!userId) return

    // Simulate real-time balance updates
    const user = await window.DatabaseManager.getUser(userId)
    if (user) {
      document.getElementById("totalBalance").textContent = this.formatNumber(user.wallet.total_coins)
      document.getElementById("todayEarning").textContent = this.formatNumber(user.wallet.today_earned || 0)

      // Update stats
      document.getElementById("adsWatched").textContent = user.activity.ads_watched_today || 0
      document.getElementById("totalReferrals").textContent = user.referral_data.total_referrals || 0
    }
  }

  async updateReferralData() {
    const userId = window.getCurrentUserId()
    if (!userId) return

    // Update referral statistics
    const referralStats = await window.referralManager.getReferralStats(userId)
    if (referralStats) {
      document.getElementById("totalRefs").textContent = referralStats.total
      document.getElementById("activeRefs").textContent = referralStats.active
      document.getElementById("referralEarnings").textContent = this.formatNumber(referralStats.earnings)
    }
  }

  async updateAdStats() {
    // Update ad viewing statistics
    const adStats = await window.adManager.getAdStats()
    if (adStats) {
      // Update UI with latest ad statistics
      console.log("Ad stats updated:", adStats)
    }
  }

  async checkForNotifications() {
    // Check for new notifications from admin
    const notifications = await this.getNewNotifications()
    notifications.forEach((notification) => {
      this.showNotification(notification.message, notification.type)
    })
  }

  async getNewNotifications() {
    // Simulate checking for new notifications
    return []
  }

  // Network detection
  setupNetworkDetection() {
    window.addEventListener("online", () => {
      this.isOnline = true
      this.showNotification("ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে", "success")
      this.startRealTimeUpdates()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.showNotification("ইন্টারনেট সংযোগ বিচ্ছিন্ন", "warning")
      if (this.updateInterval) {
        clearInterval(this.updateInterval)
      }
    })
  }

  // Notification system
  setupNotificationSystem() {
    // Create notification container
    if (!document.getElementById("notificationContainer")) {
      const container = document.createElement("div")
      container.id = "notificationContainer"
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 3000;
        pointer-events: none;
      `
      document.body.appendChild(container)
    }
  }

  showNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message
    notification.style.pointerEvents = "auto"

    const container = document.getElementById("notificationContainer")
    container.appendChild(notification)

    // Trigger animation
    setTimeout(() => notification.classList.add("show"), 100)

    // Auto remove
    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, duration)

    // Add click to dismiss
    notification.addEventListener("click", () => {
      notification.classList.remove("show")
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    })
  }

  // Auto-save functionality
  setupAutoSave() {
    let saveTimeout
    const autoSave = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        try {
          await this.saveAllData()
          console.log("Auto-save completed")
        } catch (error) {
          console.error("Auto-save error:", error)
        }
      }, 2000)
    }

    // Listen for data changes
    document.addEventListener("dataChanged", autoSave)
  }

  async saveAllData() {
    // Save all modified data
    await window.DatabaseManager.saveData()
    await window.referralManager.saveData()
    await window.subscriptionManager.saveData()
  }

  // Performance monitoring
  setupPerformanceMonitoring() {
    // Monitor page load time
    window.addEventListener("load", () => {
      const loadTime = performance.now()
      console.log(`Page loaded in ${loadTime.toFixed(2)}ms`)

      if (loadTime > 3000) {
        this.showNotification("অ্যাপ লোড হতে বেশি সময় লাগছে", "warning")
      }
    })

    // Monitor memory usage
    if ("memory" in performance) {
      setInterval(() => {
        const memory = performance.memory
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) {
          // 50MB
          console.warn("High memory usage detected")
        }
      }, 60000) // Check every minute
    }
  }

  // Utility functions
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }
}

// Enhanced UI Manager
class UIManager {
  constructor() {
    this.currentTheme = localStorage.getItem("theme") || "dark"
    this.currentLanguage = localStorage.getItem("language") || "bn"
    this.init()
  }

  init() {
    this.setupTheme()
    this.setupLanguage()
    this.setupAnimations()
    this.setupAccessibility()
    this.setupTouchGestures()
  }

  setupTheme() {
    document.documentElement.setAttribute("data-theme", this.currentTheme)

    const themeSelect = document.getElementById("themeSelect")
    if (themeSelect) {
      themeSelect.value = this.currentTheme
      themeSelect.addEventListener("change", (e) => {
        this.currentTheme = e.target.value
        document.documentElement.setAttribute("data-theme", this.currentTheme)
        localStorage.setItem("theme", this.currentTheme)
      })
    }
  }

  setupLanguage() {
    const languageSelect = document.getElementById("languageSelect")
    if (languageSelect) {
      languageSelect.value = this.currentLanguage
      languageSelect.addEventListener("change", (e) => {
        this.currentLanguage = e.target.value
        localStorage.setItem("language", this.currentLanguage)
        // In a real app, this would trigger language change
        window.realTimeManager.showNotification("ভাষা পরিবর্তন সফল", "success")
      })
    }
  }

  setupAnimations() {
    // Add entrance animations to cards
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animation = "slideUp 0.5s ease"
        }
      })
    })

    document.querySelectorAll(".card").forEach((card) => {
      observer.observe(card)
    })
  }

  setupAccessibility() {
    // Add keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        document.body.classList.add("keyboard-navigation")
      }
    })

    document.addEventListener("mousedown", () => {
      document.body.classList.remove("keyboard-navigation")
    })

    // Add ARIA labels
    this.addAriaLabels()
  }

  addAriaLabels() {
    const buttons = document.querySelectorAll(".btn")
    buttons.forEach((button) => {
      if (!button.getAttribute("aria-label")) {
        button.setAttribute("aria-label", button.textContent.trim())
      }
    })
  }

  setupTouchGestures() {
    // Add swipe gestures for tab navigation
    let startX = 0
    let startY = 0

    document.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    })

    document.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = startX - endX
      const diffY = startY - endY

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next tab
          this.switchToNextTab()
        } else {
          // Swipe right - previous tab
          this.switchToPreviousTab()
        }
      }
    })
  }

  switchToNextTab() {
    const tabs = document.querySelectorAll(".nav-tab")
    const activeTab = document.querySelector(".nav-tab.active")
    const currentIndex = Array.from(tabs).indexOf(activeTab)
    const nextIndex = (currentIndex + 1) % tabs.length

    tabs[nextIndex].click()
  }

  switchToPreviousTab() {
    const tabs = document.querySelectorAll(".nav-tab")
    const activeTab = document.querySelector(".nav-tab.active")
    const currentIndex = Array.from(tabs).indexOf(activeTab)
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1

    tabs[prevIndex].click()
  }
}

// Initialize managers
const realTimeManager = new RealTimeManager()
const uiManager = new UIManager()

// Global utility functions
window.showNotification = (message, type) => {
  realTimeManager.showNotification(message, type)
}

window.formatNumber = (num) => {
  return realTimeManager.formatNumber(num)
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  realTimeManager.destroy()
})

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RealTimeManager, UIManager }
}
