// Database Management System
class Database {
  constructor() {
    this.baseUrl = window.location.origin
    this.dataPath = "/data/"
  }

  // Load JSON data
  async loadData(filename) {
    try {
      const response = await fetch(`${this.dataPath}${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Error loading ${filename}:`, error)
      return null
    }
  }

  // Save JSON data (for demo - in real app would use backend API)
  async saveData(filename, data) {
    try {
      // In a real application, this would make a POST request to save data
      localStorage.setItem(`app_${filename}`, JSON.stringify(data))
      return true
    } catch (error) {
      console.error(`Error saving ${filename}:`, error)
      return false
    }
  }

  // Get user data
  async getUser(telegramId) {
    const users = await this.loadData("users.json")
    return users ? users[`user_${telegramId}`] : null
  }

  // Create new user
  async createUser(telegramData, referralCode = "") {
    const users = (await this.loadData("users.json")) || {}
    const userId = `user_${telegramData.id}`

    // Generate unique referral code
    const userReferralCode = this.generateReferralCode()

    users[userId] = {
      personal_info: {
        telegram_id: telegramData.id.toString(),
        username: telegramData.username || "",
        first_name: telegramData.first_name || "",
        last_name: telegramData.last_name || "",
        phone: "",
        email: "",
        joined_date: new Date().toISOString().split("T")[0],
        last_active: new Date().toISOString(),
        is_premium: false,
        blue_tick: false,
      },
      wallet: {
        total_coins: 0,
        pending_coins: 0,
        withdrawn_coins: 0,
        today_earned: 0,
        daily_limit: 1000,
        ads_watched_today: 0,
      },
      referral_data: {
        referral_code: userReferralCode,
        referred_by: referralCode,
        total_referrals: 0,
        active_referrals: 0,
        referral_earnings: 0,
        can_set_referrer: referralCode === "",
      },
      activity: {
        daily_bonus_claimed: false,
        last_ad_watch: "",
        total_ads_watched: 0,
        tasks_completed: [],
        login_streak: 1,
      },
      settings: {
        notifications: true,
        language: "bn",
        theme: "dark",
      },
    }

    // Process referral if exists
    if (referralCode) {
      await this.processReferral(referralCode, userId)
    }

    await this.saveData("users.json", users)
    return users[userId]
  }

  // Generate unique referral code
  generateReferralCode() {
    return "REF" + Math.random().toString(36).substr(2, 8).toUpperCase()
  }

  // Process referral
  async processReferral(referralCode, newUserId) {
    const users = (await this.loadData("users.json")) || {}
    const settings = (await this.loadData("settings.json")) || {}

    // Find referrer
    const referrer = Object.values(users).find((user) => user.referral_data.referral_code === referralCode)

    if (referrer) {
      // Update referrer's stats
      referrer.referral_data.total_referrals++
      referrer.referral_data.active_referrals++
      referrer.wallet.total_coins += settings.earning_config?.referral_bonus || 50
      referrer.referral_data.referral_earnings += settings.earning_config?.referral_bonus || 50

      await this.saveData("users.json", users)
    }
  }

  // Update user coins
  async updateCoins(telegramId, amount, type = "add") {
    const users = (await this.loadData("users.json")) || {}
    const userId = `user_${telegramId}`

    if (users[userId]) {
      if (type === "add") {
        users[userId].wallet.total_coins += amount
        users[userId].wallet.today_earned += amount
      } else if (type === "subtract") {
        users[userId].wallet.total_coins = Math.max(0, users[userId].wallet.total_coins - amount)
      }

      users[userId].personal_info.last_active = new Date().toISOString()
      await this.saveData("users.json", users)
      return users[userId]
    }
    return null
  }

  // Get app settings
  async getSettings() {
    return await this.loadData("settings.json")
  }

  // Update settings (admin only)
  async updateSettings(newSettings) {
    const currentSettings = (await this.loadData("settings.json")) || {}
    const updatedSettings = { ...currentSettings, ...newSettings }
    await this.saveData("settings.json", updatedSettings)
    return updatedSettings
  }

  // Create withdrawal request
  async createWithdrawalRequest(telegramId, amount, method, details) {
    const transactions = (await this.loadData("transactions.json")) || { withdrawal_requests: [] }
    const user = await this.getUser(telegramId)

    if (!user || user.wallet.total_coins < amount) {
      return { success: false, message: "অপর্যাপ্ত ব্যালেন্স" }
    }

    const request = {
      id: Date.now().toString(),
      user_id: telegramId,
      username: user.personal_info.username,
      first_name: user.personal_info.first_name,
      amount: amount,
      method: method,
      details: details,
      status: "pending",
      created_at: new Date().toISOString(),
      processed_at: null,
    }

    transactions.withdrawal_requests.push(request)
    await this.saveData("transactions.json", transactions)

    // Deduct coins from user
    await this.updateCoins(telegramId, amount, "subtract")

    return { success: true, request: request }
  }

  // Get user's referral link
  getReferralLink(referralCode) {
    return `${this.baseUrl}?ref=${referralCode}`
  }
}

// Initialize database
window.db = new Database()
