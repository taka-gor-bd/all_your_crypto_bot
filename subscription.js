// Subscription Management System
class SubscriptionManager {
  constructor() {
    this.subscriptions = {}
    this.plans = {}
    this.requests = {}
    this.loadData()
  }

  async loadData() {
    try {
      const response = await fetch("data/subscriptions.json")
      const data = await response.json()
      this.subscriptions = data.subscriptions || {}
      this.plans = data.plans || {}
      this.requests = data.requests || {}
    } catch (error) {
      console.error("Error loading subscription data:", error)
    }
  }

  async saveData() {
    const data = {
      subscriptions: this.subscriptions,
      plans: this.plans,
      requests: this.requests,
    }

    // In a real implementation, this would save to server
    localStorage.setItem("subscriptions", JSON.stringify(data))
    console.log("Subscription data saved")
  }

  // Check if user has active subscription
  hasActiveSubscription(userId, planType = null) {
    const userSubs = this.subscriptions[userId]
    if (!userSubs) return false

    if (planType) {
      const sub = userSubs[planType]
      return sub && new Date(sub.expiresAt) > new Date()
    }

    // Check any active subscription
    return Object.values(userSubs).some((sub) => new Date(sub.expiresAt) > new Date())
  }

  // Get user subscription status
  getSubscriptionStatus(userId) {
    const userSubs = this.subscriptions[userId] || {}
    const status = {
      premium: false,
      blueTick: false,
      expiresAt: null,
    }

    if (userSubs.premium && new Date(userSubs.premium.expiresAt) > new Date()) {
      status.premium = true
      status.expiresAt = userSubs.premium.expiresAt
    }

    if (userSubs.blue_tick && new Date(userSubs.blue_tick.expiresAt) > new Date()) {
      status.blueTick = true
    }

    return status
  }

  // Subscribe to premium
  async subscribeToPremium(userId, DatabaseManager) {
    const user = await DatabaseManager.getUser(userId)
    if (!user) {
      throw new Error("ব্যবহারকারী পাওয়া যায়নি")
    }

    const plan = this.plans.premium
    if (user.wallet.total_coins < plan.price) {
      throw new Error("পর্যাপ্ত কয়েন নেই")
    }

    // Deduct coins
    user.wallet.total_coins -= plan.price
    await DatabaseManager.updateUser(userId, user)

    // Add subscription
    if (!this.subscriptions[userId]) {
      this.subscriptions[userId] = {}
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + plan.duration)

    this.subscriptions[userId].premium = {
      planType: "premium",
      startDate: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      price: plan.price,
    }

    await this.saveData()
    return true
  }

  // Request blue tick verification
  async requestBlueTick(userId, paymentMethod, accountNumber, DatabaseManager) {
    const requestId = "bt_" + Date.now() + "_" + userId

    this.requests[requestId] = {
      id: requestId,
      userId: userId,
      type: "blue_tick",
      paymentMethod: paymentMethod,
      accountNumber: accountNumber,
      amount: this.plans.blue_tick.price,
      status: "pending",
      requestDate: new Date().toISOString(),
      adminNotes: "",
    }

    await this.saveData()
    return requestId
  }

  // Admin: Approve subscription request
  async approveRequest(requestId, adminNotes = "", DatabaseManager) {
    const request = this.requests[requestId]
    if (!request) {
      throw new Error("রিকুয়েস্ট পাওয়া যায়নি")
    }

    const userId = request.userId
    const planType = request.type

    if (!this.subscriptions[userId]) {
      this.subscriptions[userId] = {}
    }

    const plan = this.plans[planType]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + plan.duration)

    this.subscriptions[userId][planType] = {
      planType: planType,
      startDate: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      price: plan.price,
      approvedBy: "admin",
      approvedAt: new Date().toISOString(),
    }

    // Update request status
    request.status = "approved"
    request.adminNotes = adminNotes
    request.processedAt = new Date().toISOString()

    await this.saveData()
    return true
  }

  // Admin: Reject subscription request
  async rejectRequest(requestId, adminNotes = "") {
    const request = this.requests[requestId]
    if (!request) {
      throw new Error("রিকুয়েস্ট পাওয়া যায়নি")
    }

    request.status = "rejected"
    request.adminNotes = adminNotes
    request.processedAt = new Date().toISOString()

    await this.saveData()
    return true
  }

  // Get pending requests for admin
  getPendingRequests() {
    return Object.values(this.requests).filter((req) => req.status === "pending")
  }

  // Get all requests for admin
  getAllRequests() {
    return Object.values(this.requests)
  }

  // Admin: Update subscription plans
  async updatePlan(planType, planData) {
    this.plans[planType] = planData
    await this.saveData()
  }
}

// Initialize subscription manager
const subscriptionManager = new SubscriptionManager()

// UI Functions
async function subscribeToPremium(DatabaseManager, showNotification, updateUserInterface) {
  try {
    const userId = getCurrentUserId()
    await subscriptionManager.subscribeToPremium(userId, DatabaseManager)

    showNotification("প্রিমিয়াম সাবস্ক্রিপশন সফল!", "success")
    updateUserInterface()
    updateSubscriptionUI()
  } catch (error) {
    showNotification(error.message, "error")
  }
}

async function requestBlueTick(DatabaseManager, showNotification, closeModal) {
  // Show blue tick request modal
  const modal = document.createElement("div")
  modal.className = "modal-overlay"
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>ব্লু টিক ভেরিফিকেশন রিকুয়েস্ট</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>ব্লু টিক ভেরিফিকেশনের জন্য ২০০ টাকা পেমেন্ট করুন</p>
                <div class="form-group">
                    <label class="form-label">পেমেন্ট মেথড</label>
                    <select id="blueTickPaymentMethod" class="form-input">
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="rocket">Rocket</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">অ্যাকাউন্ট নম্বর</label>
                    <input type="text" id="blueTickAccount" class="form-input" placeholder="01XXXXXXXXX">
                </div>
                <div class="form-group">
                    <label class="form-label">ট্রানজেকশন আইডি</label>
                    <input type="text" id="transactionId" class="form-input" placeholder="TXN123456789">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">বাতিল</button>
                <button class="btn btn-primary" onclick="submitBlueTickRequest()">রিকুয়েস্ট পাঠান</button>
            </div>
        </div>
    `

  document.body.appendChild(modal)
}

async function submitBlueTickRequest(DatabaseManager, showNotification, closeModal) {
  try {
    const userId = getCurrentUserId()
    const paymentMethod = document.getElementById("blueTickPaymentMethod").value
    const accountNumber = document.getElementById("blueTickAccount").value
    const transactionId = document.getElementById("transactionId").value

    if (!accountNumber || !transactionId) {
      throw new Error("সব তথ্য পূরণ করুন")
    }

    const requestId = await subscriptionManager.requestBlueTick(userId, paymentMethod, accountNumber, DatabaseManager)

    showNotification("ব্লু টিক রিকুয়েস্ট পাঠানো হয়েছে! অনুমোদনের জন্য অপেক্ষা করুন।", "success")
    closeModal()
  } catch (error) {
    showNotification(error.message, "error")
  }
}

function closeModal() {
  const modal = document.querySelector(".modal-overlay")
  if (modal) {
    modal.remove()
  }
}

// Update subscription UI
function updateSubscriptionUI() {
  const userId = getCurrentUserId()
  const status = subscriptionManager.getSubscriptionStatus(userId)

  // Update premium badge
  const premiumBadge = document.getElementById("premiumBadge")
  const userName = document.getElementById("userName")

  if (status.premium) {
    premiumBadge.style.display = "inline-block"
    premiumBadge.textContent = "প্রিমিয়াম"
    premiumBadge.className = "premium-badge premium"
  } else if (status.blueTick) {
    premiumBadge.style.display = "inline-block"
    premiumBadge.textContent = "✓"
    premiumBadge.className = "premium-badge blue-tick"
  } else {
    premiumBadge.style.display = "none"
  }

  // Update subscription buttons
  const subscribeBtn = document.querySelector('[onclick="subscribeToPremium()"]')
  const blueTickBtn = document.querySelector('[onclick="requestBlueTick()"]')

  if (status.premium) {
    subscribeBtn.textContent = "প্রিমিয়াম সক্রিয়"
    subscribeBtn.disabled = true
    subscribeBtn.className = "btn btn-success"
  }

  if (status.blueTick) {
    blueTickBtn.textContent = "ব্লু টিক সক্রিয়"
    blueTickBtn.disabled = true
    blueTickBtn.className = "btn btn-success"
  }
}

// Initialize subscription UI on page load
document.addEventListener("DOMContentLoaded", () => {
  updateSubscriptionUI()
})

// Declare necessary variables
const DatabaseManager = {
  getUser: async (userId) => {
    // Mock implementation
    return { wallet: { total_coins: 500 } }
  },
  updateUser: async (userId, user) => {
    // Mock implementation
    console.log("User updated:", user)
  },
}

const showNotification = (message, type) => {
  console.log(`Notification (${type}): ${message}`)
}

const updateUserInterface = () => {
  console.log("User interface updated")
}

const getCurrentUserId = () => {
  return "user123"
}
