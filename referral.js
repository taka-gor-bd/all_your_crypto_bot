// Advanced Referral System
class ReferralSystem {
  constructor() {
    this.levels = [
      { level: 1, reward: 50, name: "সরাসরি রেফারেল" },
      { level: 2, reward: 25, name: "দ্বিতীয় স্তর" },
      { level: 3, reward: 10, name: "তৃতীয় স্তর" },
    ]
    this.init()
  }

  // Initialize referral system
  init() {
    this.setupReferralTracking()
    this.loadReferralHistory()
  }

  // Setup referral tracking from URL
  setupReferralTracking() {
    const urlParams = new URLSearchParams(window.location.search)
    const referralCode = urlParams.get("ref")

    if (referralCode && window.telegramApp.isTelegram()) {
      // Store referral code for user creation
      localStorage.setItem("pending_referral", referralCode)
    }
  }

  // Generate dynamic referral link based on current domain
  generateReferralLink(referralCode) {
    const currentDomain = window.location.origin
    const currentPath = window.location.pathname
    return `${currentDomain}${currentPath}?ref=${referralCode}`
  }

  // Process multi-level referral rewards
  async processMultiLevelReferral(newUserId, referralCode) {
    if (!referralCode) return

    const users = (await window.db.loadData("users.json")) || {}
    const referralData = (await window.db.loadData("referrals.json")) || {
      referral_stats: { total_referrals: 0, active_referrals: 0, total_earnings: 0 },
      referral_tree: {},
      pending_rewards: {},
    }

    // Find the referrer chain
    const referrerChain = await this.findReferrerChain(referralCode, users)

    // Process rewards for each level
    for (let i = 0; i < Math.min(referrerChain.length, this.levels.length); i++) {
      const referrerId = referrerChain[i]
      const level = this.levels[i]

      if (users[referrerId]) {
        // Add reward to referrer
        users[referrerId].wallet.total_coins += level.reward
        users[referrerId].referral_data.referral_earnings += level.reward

        // Update referral count for direct referrer only
        if (i === 0) {
          users[referrerId].referral_data.total_referrals++
          users[referrerId].referral_data.active_referrals++
        }

        // Track in referral tree
        if (!referralData.referral_tree[referrerId]) {
          referralData.referral_tree[referrerId] = {
            direct_referrals: [],
            total_earnings: 0,
            levels: {},
          }
        }

        if (i === 0) {
          referralData.referral_tree[referrerId].direct_referrals.push({
            user_id: newUserId,
            joined_date: new Date().toISOString(),
            level: 1,
          })
        }

        referralData.referral_tree[referrerId].total_earnings += level.reward
        referralData.referral_tree[referrerId].levels[`level_${i + 1}`] =
          (referralData.referral_tree[referrerId].levels[`level_${i + 1}`] || 0) + 1

        // Send notification to referrer
        this.sendReferralNotification(referrerId, level.reward, i + 1, newUserId)
      }
    }

    // Update global stats
    referralData.referral_stats.total_referrals++
    referralData.referral_stats.active_referrals++
    referralData.referral_stats.total_earnings += referrerChain.reduce(
      (sum, _, index) => sum + (this.levels[index]?.reward || 0),
      0,
    )

    // Save updated data
    await window.db.saveData("users.json", users)
    await window.db.saveData("referrals.json", referralData)

    return referrerChain.length
  }

  // Find referrer chain for multi-level rewards
  async findReferrerChain(referralCode, users) {
    const chain = []
    let currentReferralCode = referralCode

    // Find up to 3 levels of referrers
    for (let level = 0; level < 3; level++) {
      const referrer = Object.values(users).find((user) => user.referral_data.referral_code === currentReferralCode)

      if (!referrer) break

      const referrerId = `user_${referrer.personal_info.telegram_id}`
      chain.push(referrerId)

      // Get the referrer's referrer for next level
      currentReferralCode = referrer.referral_data.referred_by
      if (!currentReferralCode) break
    }

    return chain
  }

  // Send referral notification
  sendReferralNotification(referrerId, reward, level, newUserId) {
    // In a real app, this would send a notification via Telegram bot
    console.log(`Referral notification: User ${referrerId} earned ${reward} coins from level ${level} referral`)

    // Store notification for display
    const notification = {
      type: "referral_reward",
      referrer_id: referrerId,
      reward: reward,
      level: level,
      new_user_id: newUserId,
      timestamp: new Date().toISOString(),
    }

    // Add to pending notifications
    const notifications = JSON.parse(localStorage.getItem("pending_notifications") || "[]")
    notifications.push(notification)
    localStorage.setItem("pending_notifications", JSON.stringify(notifications))
  }

  // Load and display referral history
  async loadReferralHistory() {
    if (!window.app?.currentUser) return

    const referralData = (await window.db.loadData("referrals.json")) || { referral_tree: {} }
    const userId = `user_${window.app.currentUser.personal_info.telegram_id}`
    const userReferrals = referralData.referral_tree[userId]

    const historyContainer = document.getElementById("referralHistory")
    if (!historyContainer) return

    if (!userReferrals || !userReferrals.direct_referrals.length) {
      historyContainer.innerHTML = '<p class="text-center">এখনও কোনো রেফারেল নেই</p>'
      return
    }

    historyContainer.innerHTML = ""

    userReferrals.direct_referrals.forEach((referral, index) => {
      const referralElement = document.createElement("div")
      referralElement.className = "referral-item"
      referralElement.innerHTML = `
                <div class="referral-info">
                    <div class="referral-avatar">${index + 1}</div>
                    <div class="referral-details">
                        <h4>রেফারেল #${index + 1}</h4>
                        <p>যোগদানের তারিখ: ${new Date(referral.joined_date).toLocaleDateString("bn-BD")}</p>
                    </div>
                </div>
                <div class="referral-reward">+৫০ কয়েন</div>
            `
      historyContainer.appendChild(referralElement)
    })

    // Add level summary
    const levelSummary = document.createElement("div")
    levelSummary.className = "level-summary"
    levelSummary.innerHTML = `
            <h4>স্তর অনুযায়ী আয়:</h4>
            <div class="level-earnings">
                <div>লেভেল ১: ${userReferrals.levels.level_1 || 0} জন (${
                  (userReferrals.levels.level_1 || 0) * 50
                } কয়েন)</div>
                <div>লেভেল ২: ${userReferrals.levels.level_2 || 0} জন (${
                  (userReferrals.levels.level_2 || 0) * 25
                } কয়েন)</div>
                <div>লেভেল ৩: ${userReferrals.levels.level_3 || 0} জন (${
                  (userReferrals.levels.level_3 || 0) * 10
                } কয়েন)</div>
            </div>
            <div class="total-earnings">মোট আয়: ${userReferrals.total_earnings} কয়েন</div>
        `
    historyContainer.appendChild(levelSummary)
  }

  // Validate referral code format
  validateReferralCode(code) {
    // Check if code matches expected format (REF + 8 characters)
    return /^REF[A-Z0-9]{8}$/.test(code)
  }

  // Get referral statistics for admin panel
  async getReferralStats() {
    const referralData = (await window.db.loadData("referrals.json")) || {
      referral_stats: { total_referrals: 0, active_referrals: 0, total_earnings: 0 },
    }
    return referralData.referral_stats
  }

  // Get top referrers for leaderboard
  async getTopReferrers(limit = 10) {
    const referralData = (await window.db.loadData("referrals.json")) || { referral_tree: {} }
    const users = (await window.db.loadData("users.json")) || {}

    const referrers = Object.entries(referralData.referral_tree)
      .map(([userId, data]) => ({
        user_id: userId,
        user_name: users[userId]?.personal_info.first_name || "Unknown",
        total_referrals: data.direct_referrals.length,
        total_earnings: data.total_earnings,
      }))
      .sort((a, b) => b.total_referrals - a.total_referrals)
      .slice(0, limit)

    return referrers
  }

  // Check for pending referral notifications
  checkPendingNotifications() {
    const notifications = JSON.parse(localStorage.getItem("pending_notifications") || "[]")
    const newNotifications = notifications.filter((n) => n.type === "referral_reward")

    if (newNotifications.length > 0) {
      newNotifications.forEach((notification) => {
        window.app?.showMessage(
          `নতুন রেফারেল! আপনি ${notification.reward} কয়েন পেয়েছেন (লেভেল ${notification.level})`,
          "success",
        )
      })

      // Clear processed notifications
      const remainingNotifications = notifications.filter((n) => n.type !== "referral_reward")
      localStorage.setItem("pending_notifications", JSON.stringify(remainingNotifications))
    }
  }

  // Share referral link with custom message
  shareReferralLink(platform = "telegram") {
    const referralLink = document.getElementById("referralLink").value
    const appName = window.app?.currentSettings?.app_config?.app_name || "SHIB Earning Bot"
    const coinName = window.app?.currentSettings?.app_config?.coin_name || "SHIB"

    const message = `🚀 ${appName} এ যোগ দিন এবং ${coinName} কয়েন আয় করুন!

💰 সুবিধা:
• প্রতিদিন ফ্রি কয়েন
• বিজ্ঞাপন দেখে আয়
• রেফারেল বোনাস
• সহজ উইথড্র

🎁 আমার রেফারেল লিংক ব্যবহার করে বোনাস পান:
${referralLink}

#EarnMoney #${coinName} #TelegramBot`

    if (platform === "telegram") {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
        referralLink,
      )}&text=${encodeURIComponent(message)}`
      window.open(telegramUrl, "_blank")
    } else if (platform === "whatsapp") {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, "_blank")
    } else if (platform === "facebook") {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
      window.open(facebookUrl, "_blank")
    }
  }

  // Generate referral QR code
  generateReferralQR(referralLink) {
    // This would integrate with a QR code library
    // For now, we'll use a simple QR code API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`
    return qrApiUrl
  }
}

// Initialize referral system
window.referralSystem = new ReferralSystem()

// Add CSS for referral elements
const referralStyles = `
.referral-levels {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.level-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--background-color);
    border-radius: var(--border-radius);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.level-info h4 {
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}

.level-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.level-reward {
    background: var(--gradient-primary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
}

.referral-history {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.referral-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--background-color);
    border-radius: var(--border-radius);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.referral-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.referral-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
}

.referral-details h4 {
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}

.referral-details p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.referral-reward {
    background: var(--success-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
}

.level-summary {
    background: var(--surface-color);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 1rem;
}

.level-summary h4 {
    margin: 0 0 1rem 0;
    color: var(--primary-color);
}

.level-earnings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.level-earnings div {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.total-earnings {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-color);
    text-align: center;
    padding: 0.75rem;
    background: var(--background-color);
    border-radius: var(--border-radius);
}

.subscription-benefits ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
}

.subscription-benefits li {
    padding: 0.5rem 0;
    color: var(--text-secondary);
}

.subscription-benefits li:before {
    content: "✓";
    color: var(--success-color);
    font-weight: bold;
    margin-right: 0.5rem;
}

.btn-group {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.btn-group .btn {
    flex: 1;
}

@media (max-width: 480px) {
    .btn-group {
        flex-direction: column;
    }
    
    .level-item,
    .referral-item {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
        gap: 1rem;
    }
}
`

// Add styles to document
const styleSheet = document.createElement("style")
styleSheet.textContent = referralStyles
document.head.appendChild(styleSheet)
