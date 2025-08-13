// Smart Ad Integration System
class AdSystem {
  constructor() {
    this.adNetworks = new Map()
    this.adQueue = []
    this.lastAdTime = 0
    this.adInterval = null
    this.clickAdChance = 0.1 // 10% chance on button clicks
    this.settings = null
    this.userInteractionCount = 0
    this.sessionStartTime = Date.now()
    this.init()
  }

  async init() {
    // Load ad settings
    await this.loadAdSettings()

    // Initialize ad networks
    this.initializeAdNetworks()

    // Setup automatic ad system
    this.setupAutoAds()

    // Setup click-based ads
    this.setupClickAds()

    // Track user interactions
    this.trackUserInteractions()
  }

  // Load ad settings from database
  async loadAdSettings() {
    const settings = await window.db.getSettings()
    this.settings = settings?.ad_config || {
      monetag_zone_id: "9709495",
      auto_ad_interval: 120, // 2 minutes
      ad_frequency: 3,
      show_ads: true,
      click_ad_chance: 0.1,
      min_session_time: 30, // 30 seconds before first ad
      max_ads_per_session: 10,
      respect_premium: true,
    }
  }

  // Initialize ad networks
  initializeAdNetworks() {
    // Monetag Network
    this.adNetworks.set("monetag", {
      name: "Monetag",
      zoneId: this.settings.monetag_zone_id,
      types: ["popup", "interstitial", "inapp"],
      initialized: false,
      revenue: 0,
      impressions: 0,
      clicks: 0,
    })

    // Initialize Monetag SDK
    this.initializeMonetag()
  }

  // Initialize Monetag SDK
  initializeMonetag() {
    if (typeof window.monetag === "undefined") {
      // Create monetag object if SDK not loaded
      window.monetag = {
        showAd: this.createMonetagShowFunction(),
      }
    }

    const network = this.adNetworks.get("monetag")
    network.initialized = true
  }

  // Create Monetag show function
  createMonetagShowFunction() {
    return (type = "interstitial") => {
      return new Promise((resolve, reject) => {
        try {
          const zoneId = this.settings.monetag_zone_id

          if (type === "popup") {
            // Rewarded Popup
            if (typeof show_9709495 !== "undefined") {
              show_9709495("pop")
                .then(() => {
                  this.onAdCompleted("monetag", "popup")
                  resolve()
                })
                .catch(reject)
            } else {
              reject(new Error("Monetag popup not available"))
            }
          } else if (type === "interstitial") {
            // Rewarded Interstitial
            if (typeof show_9709495 !== "undefined") {
              show_9709495()
                .then(() => {
                  this.onAdCompleted("monetag", "interstitial")
                  resolve()
                })
                .catch(reject)
            } else {
              reject(new Error("Monetag interstitial not available"))
            }
          } else if (type === "inapp") {
            // In-App Interstitial
            if (typeof show_9709495 !== "undefined") {
              show_9709495({
                type: "inApp",
                inAppSettings: {
                  frequency: this.settings.ad_frequency || 2,
                  capping: 0.1,
                  interval: 30,
                  timeout: 5,
                  everyPage: false,
                },
              })
                .then(() => {
                  this.onAdCompleted("monetag", "inapp")
                  resolve()
                })
                .catch(reject)
            } else {
              reject(new Error("Monetag in-app not available"))
            }
          }
        } catch (error) {
          reject(error)
        }
      })
    }
  }

  // Setup automatic ad system
  setupAutoAds() {
    if (!this.settings.show_ads) return

    // Wait for minimum session time before showing first ad
    setTimeout(() => {
      this.startAutoAdTimer()
    }, this.settings.min_session_time * 1000)
  }

  // Start automatic ad timer
  startAutoAdTimer() {
    if (this.adInterval) {
      clearInterval(this.adInterval)
    }

    this.adInterval = setInterval(() => {
      this.showSmartAd("auto")
    }, this.settings.auto_ad_interval * 1000)
  }

  // Setup click-based ads
  setupClickAds() {
    document.addEventListener("click", (event) => {
      // Only trigger on button clicks
      if (event.target.matches("button, .btn, .task-item")) {
        this.userInteractionCount++

        // Show ad based on chance and conditions
        if (Math.random() < this.settings.click_ad_chance) {
          setTimeout(() => {
            this.showSmartAd("click")
          }, 1000) // 1 second delay after click
        }
      }
    })
  }

  // Track user interactions for smart ad timing
  trackUserInteractions() {
    let interactionTimer = 0

    document.addEventListener("click", () => {
      interactionTimer = Date.now()
    })

    document.addEventListener("scroll", () => {
      interactionTimer = Date.now()
    })

    // Check for idle time
    setInterval(() => {
      const idleTime = Date.now() - interactionTimer
      if (idleTime > 60000) {
        // 1 minute idle
        this.onUserIdle()
      }
    }, 30000) // Check every 30 seconds
  }

  // Handle user idle state
  onUserIdle() {
    // Reduce ad frequency when user is idle
    this.clickAdChance = Math.max(0.05, this.clickAdChance * 0.8)
  }

  // Show smart ad with intelligence
  async showSmartAd(trigger = "manual", type = "auto") {
    // Check if ads should be shown
    if (!this.shouldShowAd()) {
      return false
    }

    // Check premium status
    if (this.settings.respect_premium && window.app?.currentUser?.personal_info?.is_premium) {
      return false
    }

    // Determine ad type based on trigger and user behavior
    const adType = this.determineAdType(trigger)

    try {
      // Show loading indicator for manual ads
      if (trigger === "manual") {
        this.showAdLoadingIndicator()
      }

      // Show the ad
      await this.showAd("monetag", adType)

      // Update last ad time
      this.lastAdTime = Date.now()

      // Track ad impression
      this.trackAdImpression("monetag", adType, trigger)

      return true
    } catch (error) {
      console.error("Ad error:", error)

      if (trigger === "manual") {
        window.app?.showMessage("বিজ্ঞাপন লোড করতে সমস্যা হয়েছে", "error")
      }

      return false
    } finally {
      if (trigger === "manual") {
        this.hideAdLoadingIndicator()
      }
    }
  }

  // Determine optimal ad type
  determineAdType(trigger) {
    const sessionTime = Date.now() - this.sessionStartTime
    const adCount = this.getSessionAdCount()

    if (trigger === "manual") {
      // For manual triggers (watch ad button), use rewarded interstitial
      return "interstitial"
    } else if (trigger === "auto") {
      // For automatic ads, use less intrusive popup
      return sessionTime > 300000 ? "interstitial" : "popup" // 5 minutes
    } else if (trigger === "click") {
      // For click-based ads, use in-app or popup
      return adCount < 3 ? "popup" : "inapp"
    }

    return "popup"
  }

  // Check if ad should be shown
  shouldShowAd() {
    const now = Date.now()
    const timeSinceLastAd = now - this.lastAdTime
    const sessionAdCount = this.getSessionAdCount()
    const minInterval = 45000 // 45 seconds minimum between ads

    // Check various conditions
    if (!this.settings.show_ads) return false
    if (timeSinceLastAd < minInterval) return false
    if (sessionAdCount >= this.settings.max_ads_per_session) return false
    if (document.hidden) return false // Don't show ads when tab is not active

    return true
  }

  // Show specific ad
  async showAd(network, type) {
    const adNetwork = this.adNetworks.get(network)
    if (!adNetwork || !adNetwork.initialized) {
      throw new Error(`Ad network ${network} not available`)
    }

    if (network === "monetag") {
      return await window.monetag.showAd(type)
    }

    throw new Error(`Unknown ad network: ${network}`)
  }

  // Handle ad completion
  onAdCompleted(network, type) {
    const adNetwork = this.adNetworks.get(network)
    if (adNetwork) {
      adNetwork.impressions++
      adNetwork.clicks++
    }

    // Reward user for watching ad
    this.rewardUser(network, type)

    // Track completion
    this.trackAdCompletion(network, type)

    // Haptic feedback
    if (window.telegramApp) {
      window.telegramApp.hapticFeedback("medium")
    }
  }

  // Reward user for watching ad
  async rewardUser(network, type) {
    if (!window.app?.currentUser) return

    const settings = await window.db.getSettings()
    let reward = settings?.earning_config?.ad_reward || 10

    // Different rewards for different ad types
    if (type === "interstitial") {
      reward = Math.floor(reward * 1.5) // 50% more for interstitial
    } else if (type === "inapp") {
      reward = Math.floor(reward * 0.8) // 20% less for in-app
    }

    // Add coins to user
    await window.db.updateCoins(window.app.currentUser.personal_info.telegram_id, reward)

    // Update UI
    if (window.app.loadUserData) {
      await window.app.loadUserData()
    }

    // Show reward message
    window.app?.showMessage(`বিজ্ঞাপন দেখার জন্য ধন্যবাদ! +${reward} কয়েন`, "success")
  }

  // Track ad impression
  trackAdImpression(network, type, trigger) {
    const impression = {
      network: network,
      type: type,
      trigger: trigger,
      timestamp: new Date().toISOString(),
      user_id: window.app?.currentUser?.personal_info?.telegram_id,
      session_time: Date.now() - this.sessionStartTime,
      interaction_count: this.userInteractionCount,
    }

    // Store impression data
    const impressions = JSON.parse(localStorage.getItem("ad_impressions") || "[]")
    impressions.push(impression)

    // Keep only last 100 impressions
    if (impressions.length > 100) {
      impressions.splice(0, impressions.length - 100)
    }

    localStorage.setItem("ad_impressions", JSON.stringify(impressions))
  }

  // Track ad completion
  trackAdCompletion(network, type) {
    const completion = {
      network: network,
      type: type,
      timestamp: new Date().toISOString(),
      user_id: window.app?.currentUser?.personal_info?.telegram_id,
      reward_given: true,
    }

    const completions = JSON.parse(localStorage.getItem("ad_completions") || "[]")
    completions.push(completion)

    if (completions.length > 100) {
      completions.splice(0, completions.length - 100)
    }

    localStorage.setItem("ad_completions", JSON.stringify(completions))
  }

  // Get session ad count
  getSessionAdCount() {
    const impressions = JSON.parse(localStorage.getItem("ad_impressions") || "[]")
    const sessionStart = this.sessionStartTime
    return impressions.filter((imp) => new Date(imp.timestamp).getTime() > sessionStart).length
  }

  // Show ad loading indicator
  showAdLoadingIndicator() {
    const indicator = document.createElement("div")
    indicator.id = "adLoadingIndicator"
    indicator.className = "ad-loading-overlay"
    indicator.innerHTML = `
      <div class="ad-loading-content">
        <div class="loading"></div>
        <p>বিজ্ঞাপন লোড হচ্ছে...</p>
        <small>অনুগ্রহ করে অপেক্ষা করুন</small>
      </div>
    `
    document.body.appendChild(indicator)
  }

  // Hide ad loading indicator
  hideAdLoadingIndicator() {
    const indicator = document.getElementById("adLoadingIndicator")
    if (indicator) {
      indicator.remove()
    }
  }

  // Add new ad network
  addAdNetwork(config) {
    this.adNetworks.set(config.id, {
      name: config.name,
      zoneId: config.zoneId,
      scriptUrl: config.scriptUrl,
      types: config.types || ["popup"],
      initialized: false,
      revenue: 0,
      impressions: 0,
      clicks: 0,
    })

    // Load network script
    this.loadAdNetworkScript(config)
  }

  // Load ad network script
  loadAdNetworkScript(config) {
    const script = document.createElement("script")
    script.src = config.scriptUrl
    script.onload = () => {
      const network = this.adNetworks.get(config.id)
      network.initialized = true
      console.log(`Ad network ${config.name} initialized`)
    }
    script.onerror = () => {
      console.error(`Failed to load ad network: ${config.name}`)
    }
    document.head.appendChild(script)
  }

  // Get ad statistics
  getAdStats() {
    const impressions = JSON.parse(localStorage.getItem("ad_impressions") || "[]")
    const completions = JSON.parse(localStorage.getItem("ad_completions") || "[]")

    const today = new Date().toDateString()
    const todayImpressions = impressions.filter((imp) => new Date(imp.timestamp).toDateString() === today).length

    const todayCompletions = completions.filter((comp) => new Date(comp.timestamp).toDateString() === today).length

    return {
      total_impressions: impressions.length,
      total_completions: completions.length,
      today_impressions: todayImpressions,
      today_completions: todayCompletions,
      completion_rate: impressions.length > 0 ? ((completions.length / impressions.length) * 100).toFixed(1) : 0,
      networks: Array.from(this.adNetworks.entries()).map(([id, network]) => ({
        id,
        name: network.name,
        impressions: network.impressions,
        clicks: network.clicks,
        revenue: network.revenue,
      })),
    }
  }

  // Update ad settings
  async updateAdSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }

    // Restart auto ad timer with new interval
    if (this.adInterval) {
      clearInterval(this.adInterval)
      this.startAutoAdTimer()
    }

    // Update click ad chance
    this.clickAdChance = this.settings.click_ad_chance || 0.1
  }

  // Pause ads (for premium users or admin)
  pauseAds() {
    if (this.adInterval) {
      clearInterval(this.adInterval)
      this.adInterval = null
    }
    this.settings.show_ads = false
  }

  // Resume ads
  resumeAds() {
    this.settings.show_ads = true
    this.startAutoAdTimer()
  }

  // Clean up
  destroy() {
    if (this.adInterval) {
      clearInterval(this.adInterval)
    }

    // Remove event listeners
    document.removeEventListener("click", this.clickHandler)
  }
}

// Initialize ad system
window.adSystem = new AdSystem()

// Global function for manual ad watching
window.watchAd = async () => {
  return await window.adSystem.showSmartAd("manual")
}

// Add CSS for ad loading indicator
const adStyles = `
.ad-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.ad-loading-content {
  background: var(--surface-color);
  border-radius: var(--border-radius);
  padding: 2rem;
  text-align: center;
  max-width: 300px;
  width: 90%;
}

.ad-loading-content .loading {
  margin: 0 auto 1rem auto;
}

.ad-loading-content p {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 600;
}

.ad-loading-content small {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Ad reward animation */
@keyframes adReward {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.ad-reward-popup {
  animation: adReward 0.5s ease-out;
}

/* Smart ad button states */
.ad-button {
  position: relative;
  overflow: hidden;
}

.ad-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.ad-button:hover::before {
  left: 100%;
}

.ad-cooldown {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.ad-available {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 107, 53, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 53, 0);
  }
}
`

// Add styles to document
const adStyleSheet = document.createElement("style")
adStyleSheet.textContent = adStyles
document.head.appendChild(adStyleSheet)
