
/* ==========================================================================
   PCOS CARE - APPLICATION LOGIC
   Handles Navigation, Authentication, Onboarding, Symptom Checker,
   Period Tracker, Care Solutions, Diet Planner, Quiz, and Doctor Prep.
   ========================================================================== */

// --- STATE MANAGEMENT & LOCAL STORAGE ---
let currentUser = JSON.parse(localStorage.getItem('pcosUser')) || null;
let periodRecords = JSON.parse(localStorage.getItem('pcosPeriods')) || [];
let dashboardChartInstance = null;

// --- INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initDashboardChart();
    renderPeriodHistory();
    initQuiz();
});

// --- NAVIGATION CONTROLLER ---
function switchView(viewId) {
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.remove('active-view'));

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.add('active-view');
    }

    // Update navbar active states
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    if (event && event.target) {
        event.target.classList.add('active-nav');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- AUTHENTICATION & ONBOARDING MODAL ---
function openAuthModal(mode) {
    document.getElementById('authModal').classList.remove('hidden');
    if (mode === 'login') {
        switchAuthTab('login');
    } else {
        switchAuthTab('register');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('onboardingContainer').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('authTabs').classList.remove('hidden');
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('tabLoginBtn');
    const regBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginBtn.className = 'flex-1 pb-2 font-bold text-center border-b-2 border-[#C45B82] text-[#C45B82]';
        regBtn.className = 'flex-1 pb-2 font-bold text-center border-b-2 border-transparent text-gray-400';
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        regBtn.className = 'flex-1 pb-2 font-bold text-center border-b-2 border-[#C45B82] text-[#C45B82]';
        loginBtn.className = 'flex-1 pb-2 font-bold text-center border-b-2 border-transparent text-gray-400';
    }
}

let tempRegisterUser = null;

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    tempRegisterUser = { name, email };

    // Hide register form, show onboarding questionnaire
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authTabs').classList.add('hidden');
    document.getElementById('onboardingContainer').classList.remove('hidden');
}

function handleOnboardingSubmit(e) {
    e.preventDefault();
    const diagnosed = document.getElementById('onboardDiagnosed').value;
    const concern = document.getElementById('onboardConcern').value;

    currentUser = {
        ...tempRegisterUser,
        diagnosed,
        concern
    };

    localStorage.setItem('pcosUser', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    switchView('dashboard');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    currentUser = {
        name: formattedName,
        email,
        diagnosed: 'Exploring',
        concern: 'General wellness'
    };

    localStorage.setItem('pcosUser', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    switchView('dashboard');
}

function updateAuthUI() {
    const greeting = document.getElementById('navUserGreeting');
    const authBtn = document.getElementById('authTriggerBtn');

    if (currentUser) {
        greeting.textContent = `Hi, ${currentUser.name}`;
        greeting.classList.remove('hidden');
        authBtn.textContent = 'Logout';
        authBtn.onclick = handleLogout;

        // Update dashboard elements
        document.getElementById('dashNameDisplay').textContent = currentUser.name;
        document.getElementById('dashPrimaryGoal').textContent = currentUser.concern || 'General Wellness';
        document.getElementById('dashDiagnosisStatus').textContent = currentUser.diagnosed || 'Exploring';
    } else {
        greeting.classList.add('hidden');
        authBtn.textContent = 'Login / Register';
        authBtn.onclick = () => openAuthModal('login');
    }
}

function handleLogout() {
    localStorage.removeItem('pcosUser');
    currentUser = null;
    updateAuthUI();
    switchView('home');
}

// --- SYMPTOM CHECKER MODULE ---
function handleSymptomSubmit(e) {
    e.preventDefault();
    const checkedBoxes = document.querySelectorAll('input[name="symptom"]:checked');
    const container = document.getElementById('symptomResultContainer');
    const content = document.getElementById('symptomResultContent');

    if (checkedBoxes.length === 0) {
        alert('Please select at least one symptom to analyze.');
        return;
    }

    let symptoms = Array.from(checkedBoxes).map(b => b.value);
    
    let html = `<p><strong>Selected Symptoms (${symptoms.length}):</strong> ${symptoms.join(', ')}</p>`;
    html += `<p class="text-sm">These indicators are commonly evaluated by clinicians when screening for hormonal imbalances or polycystic ovary presentations. Consider logging these patterns across your cycle history.</p>`;

    content.innerHTML = html;
    container.classList.remove('hidden');
}

// --- PERIOD TRACKER MODULE ---
function handlePeriodSubmit(e) {
    e.preventDefault();
    const startDate = document.getElementById('periodStartDate').value;
    const endDate = document.getElementById('periodEndDate').value;
    const cycleLength = parseInt(document.getElementById('periodCycleLength').value, 10);

    if (!startDate || !endDate) return;

    const startObj = new Date(startDate);
    const nextObj = new Date(startObj);
    nextObj.setDate(startObj.getDate() + cycleLength);

    const record = {
        startDate,
        endDate,
        cycleLength,
        nextEstimated: nextObj.toISOString().split('T')[0]
    };

    periodRecords.unshift(record);
    localStorage.setItem('pcosPeriods', JSON.stringify(periodRecords));

    renderPeriodHistory();
    document.getElementById('periodLogForm').reset();
}

function renderPeriodHistory() {
    const container = document.getElementById('periodHistoryContainer');
    const dashNext = document.getElementById('dashNextPeriod');

    if (periodRecords.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-sm italic">No period records saved yet.</p>`;
        dashNext.textContent = 'Not Logged';
        return;
    }

    dashNext.textContent = periodRecords[0].nextEstimated;

    let html = '';
    periodRecords.forEach((rec, idx) => {
        html += `
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                <div>
                    <p class="text-sm font-bold">Log #${periodRecords.length - idx}: ${rec.startDate} to ${rec.endDate}</p>
                    <p class="text-xs text-gray-500">Est. Next Period: ${rec.nextEstimated} (${rec.cycleLength}-day cycle)</p>
                </div>
                <button onclick="deletePeriodRecord(${idx})" class="text-red-400 hover:text-red-600 text-sm"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deletePeriodRecord(idx) {
    periodRecords.splice(idx, 1);
    localStorage.setItem('pcosPeriods', JSON.stringify(periodRecords));
    renderPeriodHistory();
}

// --- CARE & SOLUTIONS MODULE ---
function openCareDetail(topic) {
    const card = document.getElementById('careDetailCard');
    const title = document.getElementById('careDetailTitle');
    const body = document.getElementById('careDetailBody');

    const data = {
        weight: {
            title: 'Metabolic & Weight Management',
            content: '<p>Focus on balanced insulin response rather than restrictive low-calorie diets. Include high-fiber vegetables, healthy fats (almonds, walnuts, olive oil), and lean protein with every meal. Pair 30 minutes of brisk walking with 3 weekly sessions of strength training.</p>'
        },
        hair: {
            title: 'Hair Loss & Hirsutism Support',
            content: '<p>Elevated androgens can contribute to scalp hair thinning and excess facial hair. Support your hormonal balance with anti-inflammatory foods, check your ferritin/iron levels, use gentle sulfate-free shampoos, and consult a dermatologist for topical solutions.</p>'
        },
        acne: {
            title: 'Acne & Skin Care Recommendations',
            content: '<p>Hormonal breakouts typically present along the jawline and chin. Maintain a gentle skincare routine using salicylic acid or niacinamide cleansers, minimize high-glycemic processed sugars, and stay well-hydrated daily.</p>'
        }
    };

    if (data[topic]) {
        title.textContent = data[topic].title;
        body.innerHTML = data[topic].content;
        card.classList.remove('hidden');
    }
}

// --- DIET PLANNER MODULE ---
function generateMealPlan() {
    const pref = document.getElementById('dietPreferenceSelect').value;
    const grid = document.getElementById('mealPlanResultGrid');

    const plans = {
        veg: {
            b: 'Moong Dal Chilla with Mint Chutney & Green Tea',
            s: 'Handful of Roasted Makhana (Foxnuts) + 5 Almonds',
            l: '2 Multigrain Rotis + Palak Paneer + Cucumber Tomato Salad',
            e: 'Roasted Chana or Sprouted Moong Salad',
            d: 'Vegetable Khichdi with Steamed Vegetables & Curd'
        },
        nonveg: {
            b: '2 Boiled Eggs / Spinach Omelette + Whole Wheat Toast',
            s: 'Walnuts & Chia Seed Infused Coconut Water',
            l: 'Grilled Chicken Breast / Fish Curry + Brown Rice + Salad',
            e: 'Boiled Egg Whites with Pepper',
            d: 'Clear Chicken Vegetable Soup with Stewed Greens'
        },
        vegan: {
            b: 'Oats Porridge made with Almond Milk & Flaxseeds',
            s: 'Sliced Apple with Natural Peanut Butter',
            l: 'Tofu & Mixed Vegetable Stir-Fry + Brown Rice',
            e: 'Handful of Mixed Seeds & Pumpkin Seeds',
            d: 'Lentil Soup (Dal) with Steamed Broccoli'
        }
    };

    const selected = plans[pref];
    document.getElementById('mealBreakfast').textContent = selected.b;
    document.getElementById('mealSnack').textContent = selected.s;
    document.getElementById('mealLunch').textContent = selected.l;
    document.getElementById('mealEvening').textContent = selected.e;
    document.getElementById('mealDinner').textContent = selected.d;

    grid.classList.remove('hidden');
}

// --- MYTH VS FACT QUIZ MODULE ---
const quizData = [
    {
        q: 'MYTH or FACT: PCOS only affects overweight individuals.',
        options: ['Myth', 'Fact'],
        correct: 0,
        explanation: 'Myth. PCOS can affect individuals across all body types and weights.'
    },
    {
        q: 'MYTH or FACT: Regular physical activity helps improve insulin sensitivity.',
        options: ['Myth', 'Fact'],
        correct: 1,
        explanation: 'Fact. Regular exercise enhances glucose uptake and helps manage insulin resistance.'
    },
    {
        q: 'MYTH or FACT: Symptoms alone are sufficient to clinically diagnose PCOS.',
        options: ['Myth', 'Fact'],
        correct: 0,
        explanation: 'Myth. Clinical diagnosis requires evaluating medical history, physical symptoms, and diagnostic tests (such as ultrasounds or hormone panels).'
    }
];

let currentQuizIndex = 0;
let quizScore = 0;

function initQuiz() {
    loadQuizQuestion();
}

function loadQuizQuestion() {
    if (currentQuizIndex >= quizData.length) {
        document.getElementById('quizContainer').classList.add('hidden');
        document.getElementById('quizCompletion').classList.remove('hidden');
        document.getElementById('quizScoreText').textContent = `You scored ${quizScore} out of ${quizData.length}!`;
        return;
    }

    const item = quizData[currentQuizIndex];
    document.getElementById('quizQuestionTitle').textContent = `Question ${currentQuizIndex + 1} of ${quizData.length}`;
    document.getElementById('quizQuestionText').textContent = item.q;

    const optionsBox = document.getElementById('quizOptions');
    optionsBox.innerHTML = '';
    item.options.forEach((opt, idx) => {
        optionsBox.innerHTML += `<button onclick="submitQuizAnswer(${idx})" class="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-pink-50 transition font-medium text-sm">${opt}</button>`;
    });

    document.getElementById('quizFeedback').classList.add('hidden');
    document.getElementById('quizNextBtn').classList.add('hidden');
}

function submitQuizAnswer(selectedIdx) {
    const item = quizData[currentQuizIndex];
    const feedbackBox = document.getElementById('quizFeedback');
    
    if (selectedIdx === item.correct) {
        quizScore++;
        feedbackBox.className = 'p-4 rounded-xl mb-6 bg-emerald-50 text-emerald-800 text-sm font-medium';
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-check mr-2"></i> Correct! ${item.explanation}`;
    } else {
        feedbackBox.className = 'p-4 rounded-xl mb-6 bg-red-50 text-red-800 text-sm font-medium';
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-xmark mr-2"></i> Incorrect. ${item.explanation}`;
    }

    feedbackBox.classList.remove('hidden');
    document.getElementById('quizNextBtn').classList.remove('hidden');
}

function nextQuizQuestion() {
    currentQuizIndex++;
    loadQuizQuestion();
}

function restartQuiz() {
    currentQuizIndex = 0;
    quizScore = 0;
    document.getElementById('quizCompletion').classList.add('hidden');
    document.getElementById('quizContainer').classList.remove('hidden');
    loadQuizQuestion();
}

// --- DOCTOR VISIT PREP MODULE ---
function generateDocSummary(e) {
    e.preventDefault();
    const reason = document.getElementById('docReasonInput').value;
    const questions = document.getElementById('docQuestionsInput').value;
    const output = document.getElementById('docSummaryOutput');
    const content = document.getElementById('docSummaryContent');

    const name = currentUser ? currentUser.name : 'Patient';

    let html = `
        <p><strong>Patient Name:</strong> ${name}</p>
        <p><strong>Primary Concern:</strong> ${reason}</p>
        <p><strong>Patient Questions:</strong> ${questions || 'None specified.'}</p>
        <p><strong>Cycle History Summary:</strong> ${periodRecords.length > 0 ? 'Last logged period start: ' + periodRecords[0].startDate : 'No period logs available.'}</p>
    `;

    content.innerHTML = html;
    output.classList.remove('hidden');
}

// --- DASHBOARD CHART.JS INIT ---
function initDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Symptom Intensity Score (1-5)',
                data: [2, 3, 2, 4, 3, 2, 1],
                borderColor: '#C45B82',
                backgroundColor: 'rgba(196, 91, 130, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 5 }
            }
        }
    });
}