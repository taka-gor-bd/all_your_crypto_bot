import { Chart } from "@/components/ui/chart"
// Admin Panel Logic
class AdminPanel {
  constructor() {
    this.isLoggedIn = false
    this.currentSettings = null
    this.charts = {}
    this.init()
  }

  async init() {
    // Check if already logged in
    const savedLogin = localStorage.getItem("admin_logged_in")
    if (savedLogin === "true") {
      this.isLoggedIn = true
      await this.loadAdminPanel()
    } else {
      this.showLoginModal()
    }

    // Setup login form
    document.getElementById("adminLoginForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.login()
    })

    // Setup task form
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveTask()
    })

    // Setup real-time color preview
    this.setupColorPreview()

    // Hide loading
    document.getElementById("loadingOverlay").style.display = "none"
  }

  // Show login modal
  showLoginModal() {
    document.getElementById("loginModal").style.display = "flex"
    document.getElementById("adminPanel").style.display = "none"
  }

  // Login function
  async login() {
    const email = document.getElementById("adminEmail").value
    const password = document.getElementById("adminPassword").value

    const settings = await window.db.getSettings()
    if (settings && settings.admin.email === email && settings.admin.password === password) {
      this.isLoggedIn = true
      localStorage.setItem("admin_logged_in", "true")
      document.getElementById("loginModal").style.display = "none"
      await this.loadAdminPanel()
    } else {
      alert("ভুল ইমেইল বা পাসওয়ার্ড")
    }
  }

  // Logout function
  logout() {
    this.isLoggedIn = false
    localStorage.removeItem("admin_logged_in")
    this.showLoginModal()
  }

  // Load admin panel
  async loadAdminPanel() {
    document.getElementById("adminPanel").style.display = "block"
    this.currentSettings = await window.db.getSettings()

    // Update app name in header
    document.getElementById("adminAppName").textContent = `${this.currentSettings.app_config.app_name} - Admin Panel`

    // Load dashboard data
    await this.loadDashboard()

    // Load settings
    await this.loadSettings()

    // Load customization
    await this.loadCustomization()

    // Load ads settings
    await this.loadAdsSettings()

    // Load tasks
    await this.loadTasks()
  }

  // Load dashboard data
  async loadDashboard() {
    const users = (await window.db.loadData("users.json")) || {}
    const transactions = (await window.db.loadData("transactions.json")) || { withdrawal_requests: [] }

    // Calculate stats
    const totalUsers = Object.keys(users).length
    const totalCoins = Object.values(users).reduce((sum, user) => sum + user.wallet.total_coins, 0)
    const pendingWithdrawals = transactions.withdrawal_requests.filter((req) => req.status === "pending").length
    const totalAdsWatched = Object.values(users).reduce((sum, user) => sum + user.activity.total_ads_watched, 0)

    // Update stats
    document.getElementById("totalUsers").textContent = totalUsers.toLocaleString()
    document.getElementById("totalCoins").textContent = totalCoins.toLocaleString()
    document.getElementById("pendingWithdrawals").textContent = pendingWithdrawals
    document.getElementById("totalAdsWatched").textContent = totalAdsWatched.toLocaleString()

    // Load charts
    this.loadCharts(users)

    // Load recent activity
    this.loadRecentActivity(users, transactions)
  }

  // Load charts
  loadCharts(users) {
    // User Growth Chart
    const userGrowthCtx = document.getElementById("userGrowthChart").getContext("2d")
    if (this.charts.userGrowth) {
      this.charts.userGrowth.destroy()
    }

    // Generate sample data for last 7 days
    const last7Days = []
    const userCounts = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      last7Days.push(date.toLocaleDateString("bn-BD"))
      // Sample data - in real app, calculate actual daily user counts
      userCounts.push(Math.floor(Object.keys(users).length * (0.7 + Math.random() * 0.3)))
    }

    this.charts.userGrowth = new Chart(userGrowthCtx, {
      type: "line",
      data: {
        labels: last7Days,
        datasets: [
          {
            label: "নতুন ব্যবহারকারী",
            data: userCounts,
            borderColor: "#ff6b35",
            backgroundColor: "rgba(255, 107, 53, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#ffffff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            ticks: {
              color: "#ffffff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    })

    // Earnings Chart
    const earningsCtx = document.getElementById("earningsChart").getContext("2d")
    if (this.charts.earnings) {
      this.charts.earnings.destroy()
    }

    // Generate sample earnings data
    const earningsData = last7Days.map(() => Math.floor(Math.random() * 10000 + 5000))

    this.charts.earnings = new Chart(earningsCtx, {
      type: "bar",
      data: {
        labels: last7Days,
        datasets: [
          {
            label: "দৈনিক আয়",
            data: earningsData,
            backgroundColor: "#4ecdc4",
            borderColor: "#4ecdc4",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#ffffff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            ticks: {
              color: "#ffffff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    })
  }

  // Load recent activity
  loadRecentActivity(users, transactions) {
    const activityList = document.getElementById("recentActivity")
    activityList.innerHTML = ""

    const activities = []

    // Add recent withdrawals
    transactions.withdrawal_requests.slice(-5).forEach((req) => {
      activities.push({
        icon: "💸",
        text: `${req.first_name} উইথড্র রিকুয়েস্ট করেছেন: ${req.amount} কয়েন`,
        time: new Date(req.created_at).toLocaleString("bn-BD"),
        timestamp: new Date(req.created_at).getTime(),
      })
    })

    // Add recent users
    Object.values(users)
      .slice(-3)
      .forEach((user) => {
        activities.push({
          icon: "👤",
          text: `${user.personal_info.first_name} নতুন যোগ দিয়েছেন`,
          time: new Date(user.personal_info.joined_date).toLocaleString("bn-BD"),
          timestamp: new Date(user.personal_info.joined_date).getTime(),
        })
      })

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp)

    // Display activities
    activities.slice(0, 10).forEach((activity) => {
      const activityElement = document.createElement("div")
      activityElement.className = "activity-item"
      activityElement.innerHTML = `
                <div class="activity-info">
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-text">${activity.text}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            `
      activityList.appendChild(activityElement)
    })
  }

  // Load users
  async loadUsers() {
    const users = (await window.db.loadData("users.json")) || {}
    const usersList = document.getElementById("usersList")
    usersList.innerHTML = ""

    Object.entries(users).forEach(([userId, user]) => {
      const userElement = document.createElement("div")
      userElement.className = "user-item"
      userElement.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${user.personal_info.first_name.charAt(0)}</div>
                    <div class="user-details">
                        <h4>${user.personal_info.first_name} ${user.personal_info.last_name || ""} ${
                          user.personal_info.blue_tick ? '<span class="blue-tick">✓</span>' : ""
                        }</h4>
                        <p>@${user.personal_info.username || "user"} • ${user.personal_info.joined_date}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="user-stat">
                        <div class="user-stat-value">${user.wallet.total_coins.toLocaleString()}</div>
                        <div class="user-stat-label">কয়েন</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.referral_data.total_referrals}</div>
                        <div class="user-stat-label">রেফারেল</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.activity.total_ads_watched}</div>
                        <div class="user-stat-label">বিজ্ঞাপন</div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editUser('${userId}')">সম্পাদনা</button>
                    <button class="btn btn-primary btn-sm" onclick="toggleBlueTick('${userId}')">${
                      user.personal_info.blue_tick ? "টিক সরান" : "ব্লু টিক"
                    }</button>
                </div>
            `
      usersList.appendChild(userElement)
    })
  }

  // Load withdrawals
  async loadWithdrawals() {
    const transactions = (await window.db.loadData("transactions.json")) || { withdrawal_requests: [] }
    const withdrawalsList = document.getElementById("withdrawalsList")
    withdrawalsList.innerHTML = ""

    transactions.withdrawal_requests.forEach((request) => {
      const withdrawalElement = document.createElement("div")
      withdrawalElement.className = "withdrawal-item"
      withdrawalElement.innerHTML = `
                <div class="withdrawal-info">
                    <div class="withdrawal-amount">${request.amount.toLocaleString()} কয়েন</div>
                    <div class="withdrawal-details">
                        ${request.first_name} (@${request.username}) • ${request.method}: ${request.details}
                        <br>তারিখ: ${new Date(request.created_at).toLocaleString("bn-BD")}
                    </div>
                </div>
                <div class="withdrawal-status status-${request.status}">
                    ${request.status === "pending" ? "পেন্ডিং" : request.status === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}
                </div>
                <div class="withdrawal-actions">
                    ${
                      request.status === "pending"
                        ? `
                        <button class="btn btn-success btn-sm" onclick="approveWithdrawal('${request.id}')">অনুমোদন</button>
                        <button class="btn btn-error btn-sm" onclick="rejectWithdrawal('${request.id}')">প্রত্যাখ্যান</button>
                    `
                        : ""
                    }
                </div>
            `
      withdrawalsList.appendChild(withdrawalElement)
    })
  }

  // Load settings
  async loadSettings() {
    if (!this.currentSettings) return

    document.getElementById("dailyBonus").value = this.currentSettings.earning_config.daily_bonus
    document.getElementById("referralBonus").value = this.currentSettings.earning_config.referral_bonus
    document.getElementById("adReward").value = this.currentSettings.earning_config.ad_reward
    document.getElementById("minWithdrawal").value = this.currentSettings.earning_config.min_withdrawal
    document.getElementById("dailyAdLimit").value = this.currentSettings.earning_config.daily_ad_limit
    document.getElementById("dailyEarnLimit").value = this.currentSettings.earning_config.daily_limit || 1000

    // Load payment methods
    const paymentMethods = this.currentSettings.subscription.payment_methods || []
    document.getElementById("bkash").checked = paymentMethods.includes("bKash")
    document.getElementById("nagad").checked = paymentMethods.includes("Nagad")
    document.getElementById("rocket").checked = paymentMethods.includes("Rocket")
  }

  // Load customization
  async loadCustomization() {
    if (!this.currentSettings) return

    document.getElementById("appName").value = this.currentSettings.app_config.app_name
    document.getElementById("coinName").value = this.currentSettings.app_config.coin_name
    document.getElementById("coinSymbol").value = this.currentSettings.app_config.coin_symbol
    document.getElementById("coinLogo").value = this.currentSettings.app_config.coin_logo

    document.getElementById("primaryColor").value = this.currentSettings.design.primary_color
    document.getElementById("secondaryColor").value = this.currentSettings.design.secondary_color
    document.getElementById("accentColor").value = this.currentSettings.design.accent_color
    document.getElementById("backgroundColor").value = this.currentSettings.design.background_color
    document.getElementById("textColor").value = this.currentSettings.design.text_color

    this.updatePreview()
  }

  // Load ads settings
  async loadAdsSettings() {
    if (!this.currentSettings) return

    document.getElementById("monetagZoneId").value = this.currentSettings.ad_config.monetag_zone_id
    document.getElementById("autoAdInterval").value = this.currentSettings.ad_config.auto_ad_interval
    document.getElementById("adFrequency").value = this.currentSettings.ad_config.ad_frequency
    document.getElementById("showAds").checked = this.currentSettings.ad_config.show_ads

    // Load ad statistics
    await this.loadAdStatistics()
  }

  // Load ad statistics
  async loadAdStatistics() {
    if (window.adSystem) {
      const stats = window.adSystem.getAdStats()

      // Update ad stats in dashboard
      const adStatsContainer = document.getElementById("adStatistics")
      if (adStatsContainer) {
        adStatsContainer.innerHTML = `
          <div class="ad-stats-grid">
            <div class="ad-stat-item">
              <div class="stat-value">${stats.total_impressions}</div>
              <div class="stat-label">মোট ইম্প্রেশন</div>
            </div>
            <div class="ad-stat-item">
              <div class="stat-value">${stats.total_completions}</div>
              <div class="stat-label">সম্পূর্ণ দেখা</div>
            </div>
            <div class="ad-stat-item">
              <div class="stat-value">${stats.completion_rate}%</div>
              <div class="stat-label">সম্পূর্ণতার হার</div>
            </div>
            <div class="ad-stat-item">
              <div class="stat-value">${stats.today_impressions}</div>
              <div class="stat-label">আজকের ইম্প্রেশন</div>
            </div>
          </div>
        `
      }
    }
  }

  // Load tasks
  async loadTasks() {
    const tasks = (await window.db.loadData("tasks.json")) || { daily_tasks: [] }
    const tasksList = document.getElementById("tasksList")
    tasksList.innerHTML = ""

    tasks.daily_tasks.forEach((task, index) => {
      const taskElement = document.createElement("div")
      taskElement.className = "task-admin-item"
      taskElement.innerHTML = `
                <div class="task-admin-info">
                    <div class="task-admin-icon">${task.icon}</div>
                    <div class="task-admin-details">
                        <h4>${task.title}</h4>
                        <p>${task.description}</p>
                        <small>টাইপ: ${task.type} • পুরস্কার: ${task.reward} কয়েন</small>
                    </div>
                </div>
                <div class="task-admin-reward">+${task.reward}</div>
                <div class="task-admin-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editTask(${index})">সম্পাদনা</button>
                    <button class="btn btn-error btn-sm" onclick="deleteTask(${index})">মুছুন</button>
                </div>
            `
      tasksList.appendChild(taskElement)
    })
  }

  // Setup color preview
  setupColorPreview() {
    const colorInputs = ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"]
    const textInputs = ["appName", "coinName"]

    colorInputs.forEach((inputId) => {
      document.getElementById(inputId).addEventListener("input", () => this.updatePreview())
    })

    textInputs.forEach((inputId) => {
      document.getElementById(inputId).addEventListener("input", () => this.updatePreview())
    })
  }

  // Update preview
  updatePreview() {
    const appName = document.getElementById("appName").value || "SHIB Earning Bot"
    const coinName = document.getElementById("coinName").value || "SHIB"
    const primaryColor = document.getElementById("primaryColor").value
    const backgroundColor = document.getElementById("backgroundColor").value

    document.getElementById("previewAppName").textContent = appName
    document.getElementById("previewCoinName").textContent = coinName

    const preview = document.getElementById("designPreview")
    preview.style.setProperty("--primary-color", primaryColor)
    preview.style.setProperty("--background-color", backgroundColor)
  }

  // Save settings
  async saveSettings() {
    const updatedSettings = {
      ...this.currentSettings,
      earning_config: {
        ...this.currentSettings.earning_config,
        daily_bonus: Number.parseInt(document.getElementById("dailyBonus").value),
        referral_bonus: Number.parseInt(document.getElementById("referralBonus").value),
        ad_reward: Number.parseInt(document.getElementById("adReward").value),
        min_withdrawal: Number.parseInt(document.getElementById("minWithdrawal").value),
        daily_ad_limit: Number.parseInt(document.getElementById("dailyAdLimit").value),
        daily_limit: Number.parseInt(document.getElementById("dailyEarnLimit").value),
      },
      subscription: {
        ...this.currentSettings.subscription,
        payment_methods: [
          document.getElementById("bkash").checked ? "bKash" : null,
          document.getElementById("nagad").checked ? "Nagad" : null,
          document.getElementById("rocket").checked ? "Rocket" : null,
        ].filter(Boolean),
      },
    }

    await window.db.updateSettings(updatedSettings)
    this.currentSettings = updatedSettings
    alert("সেটিংস সফলভাবে সেভ করা হয়েছে!")
  }

  // Save customization
  async saveCustomization() {
    const updatedSettings = {
      ...this.currentSettings,
      app_config: {
        ...this.currentSettings.app_config,
        app_name: document.getElementById("appName").value,
        coin_name: document.getElementById("coinName").value,
        coin_symbol: document.getElementById("coinSymbol").value,
        coin_logo: document.getElementById("coinLogo").value,
      },
      design: {
        ...this.currentSettings.design,
        primary_color: document.getElementById("primaryColor").value,
        secondary_color: document.getElementById("secondaryColor").value,
        accent_color: document.getElementById("accentColor").value,
        background_color: document.getElementById("backgroundColor").value,
        text_color: document.getElementById("textColor").value,
        header_gradient: `linear-gradient(135deg, ${document.getElementById("primaryColor").value}, ${document.getElementById("secondaryColor").value})`,
      },
    }

    await window.db.updateSettings(updatedSettings)
    this.currentSettings = updatedSettings
    alert("কাস্টমাইজেশন সফলভাবে সেভ করা হয়েছে!")

    // Update admin panel header
    document.getElementById("adminAppName").textContent = `${updatedSettings.app_config.app_name} - Admin Panel`
  }

  // Save ad settings
  async saveAdSettings() {
    const updatedSettings = {
      ...this.currentSettings,
      ad_config: {
        ...this.currentSettings.ad_config,
        monetag_zone_id: document.getElementById("monetagZoneId").value,
        auto_ad_interval: Number.parseInt(document.getElementById("autoAdInterval").value),
        ad_frequency: Number.parseInt(document.getElementById("adFrequency").value),
        show_ads: document.getElementById("showAds").checked,
        click_ad_chance: Number.parseFloat(document.getElementById("clickAdChance")?.value || "0.1"),
        min_session_time: Number.parseInt(document.getElementById("minSessionTime")?.value || "30"),
        max_ads_per_session: Number.parseInt(document.getElementById("maxAdsPerSession")?.value || "10"),
      },
    }

    await window.db.updateSettings(updatedSettings)
    this.currentSettings = updatedSettings

    // Update ad system settings
    if (window.adSystem) {
      await window.adSystem.updateAdSettings(updatedSettings.ad_config)
    }

    alert("বিজ্ঞাপন সেটিংস সফলভাবে সেভ করা হয়েছে!")
  }

  // Add new task
  addNewTask() {
    document.getElementById("taskModalTitle").textContent = "নতুন টাস্ক যোগ করুন"
    document.getElementById("taskForm").reset()
    document.getElementById("taskModal").style.display = "flex"
  }

  // Edit task
  async editTask(index) {
    const tasks = await window.db.loadData("tasks.json")
    const task = tasks.daily_tasks[index]

    document.getElementById("taskModalTitle").textContent = "টাস্ক সম্পাদনা করুন"
    document.getElementById("taskTitle").value = task.title
    document.getElementById("taskDescription").value = task.description
    document.getElementById("taskReward").value = task.reward
    document.getElementById("taskType").value = task.type
    document.getElementById("taskIcon").value = task.icon

    document.getElementById("taskForm").dataset.editIndex = index
    document.getElementById("taskModal").style.display = "flex"
  }

  // Save task
  async saveTask() {
    const tasks = (await window.db.loadData("tasks.json")) || { daily_tasks: [] }
    const editIndex = document.getElementById("taskForm").dataset.editIndex

    const taskData = {
      id: editIndex ? tasks.daily_tasks[editIndex].id : `task_${Date.now()}`,
      title: document.getElementById("taskTitle").value,
      description: document.getElementById("taskDescription").value,
      reward: Number.parseInt(document.getElementById("taskReward").value),
      type: document.getElementById("taskType").value,
      icon: document.getElementById("taskIcon").value,
    }

    if (editIndex !== undefined) {
      tasks.daily_tasks[editIndex] = taskData
    } else {
      tasks.daily_tasks.push(taskData)
    }

    await window.db.saveData("tasks.json", tasks)
    document.getElementById("taskModal").style.display = "none"
    document.getElementById("taskForm").removeAttribute("data-edit-index")
    await this.loadTasks()
    alert("টাস্ক সফলভাবে সেভ করা হয়েছে!")
  }

  // Delete task
  async deleteTask(index) {
    if (confirm("আপনি কি এই টাস্কটি মুছে ফেলতে চান?")) {
      const tasks = await window.db.loadData("tasks.json")
      tasks.daily_tasks.splice(index, 1)
      await window.db.saveData("tasks.json", tasks)
      await this.loadTasks()
      alert("টাস্ক মুছে ফেলা হয়েছে!")
    }
  }

  // Close task modal
  closeTaskModal() {
    document.getElementById("taskModal").style.display = "none"
    document.getElementById("taskForm").removeAttribute("data-edit-index")
  }

  // Refresh data
  async refreshData() {
    await this.loadDashboard()
    await this.loadUsers()
    await this.loadWithdrawals()
    alert("ডেটা রিফ্রেশ করা হয়েছে!")
  }

  // Add ad network
  addAdNetwork() {
    const networkName = document.getElementById("newAdNetwork").value.trim()
    const scriptUrl = document.getElementById("newAdScript").value.trim()
    const zoneId = document.getElementById("newAdZoneId").value.trim()

    if (!networkName || !scriptUrl || !zoneId) {
      alert("সব ফিল্ড পূরণ করুন")
      return
    }

    const networkConfig = {
      id: networkName.toLowerCase().replace(/\s+/g, "_"),
      name: networkName,
      scriptUrl: scriptUrl,
      zoneId: zoneId,
      types: ["popup", "interstitial"],
    }

    // Add to ad system
    if (window.adSystem) {
      window.adSystem.addAdNetwork(networkConfig)
    }

    // Clear form
    document.getElementById("newAdNetwork").value = ""
    document.getElementById("newAdScript").value = ""
    document.getElementById("newAdZoneId").value = ""

    alert("নতুন বিজ্ঞাপন নেটওয়ার্ক যোগ করা হয়েছে!")
  }
}

// Tab management
function showAdminTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.style.display = "none"
  })

  // Remove active class from all nav items
  document.querySelectorAll(".admin-nav-item").forEach((item) => {
    item.classList.remove("active")
  })

  // Show selected tab
  document.getElementById(tabName + "Tab").style.display = "block"

  // Add active class to clicked nav item
  event.target.classList.add("active")

  // Load tab-specific data
  if (tabName === "users") {
    window.adminPanel.loadUsers()
  } else if (tabName === "withdrawals") {
    window.adminPanel.loadWithdrawals()
  }
}

// Global functions
window.showAdminTab = showAdminTab
window.refreshData = () => window.adminPanel.refreshData()
window.logout = () => window.adminPanel.logout()
window.saveSettings = () => window.adminPanel.saveSettings()
window.saveCustomization = () => window.adminPanel.saveCustomization()
window.saveAdSettings = () => window.adminPanel.saveAdSettings()
window.addNewTask = () => window.adminPanel.addNewTask()
window.editTask = (index) => window.adminPanel.editTask(index)
window.deleteTask = (index) => window.adminPanel.deleteTask(index)
window.closeTaskModal = () => window.adminPanel.closeTaskModal()
window.addAdNetwork = () => window.adminPanel.addAdNetwork()

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
  window.adminPanel = new AdminPanel()
})
