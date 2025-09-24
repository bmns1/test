// --- CONFIGURATION ---
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx3LGShhqFBG5Y2TocWHYYgg8Sp-mK2YbkZ2x6tWJwf6li0teEvIYYXa5zNxDKtV4U7/exec';
const NEWSLETTER_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxdZkNNppgbr_FdH2FOAztYpujc9A4URAsQIlWnADSypDlb5_KnCiVP3EImRK96jWK3Yg/exec';
const CLIENT_ID = "14216824305-v19ecsmrhk1muaglrlhjceqjk5oeqr4n.apps.googleusercontent.com";
let ID_TOKEN = null;
let portalData = {};

// --- HELPER FUNCTIONS ---

function showToast(message, type = 'success') {
    const options = {
        text: message,
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        className: `toastify-${type}`
    };
    Toastify(options).showToast();
}

function decodeGrade(grade) {
    const gradeStr = String(grade).toUpperCase();
    if (gradeStr === 'P') return 'Pre-K';
    if (gradeStr === '0' || gradeStr === 'K') return 'KG';
    return `Grade ${gradeStr}`;
}
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : dateString;
}

// Other helper functions (generateICalLink, generateGoogleCalendarLink, etc.) remain the same...
// ... (omitted for brevity, but they should be included here)

function switchToTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('tab-content-active'));
    document.querySelectorAll(`.tab-btn[data-tab="${tabName}"]`).forEach(b => b.classList.add('tab-active'));
    document.getElementById(tabName).classList.add('tab-content-active');
    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenu.style.display === 'block'){
        mobileMenu.style.display = 'none';
        document.getElementById('menu-icon-open').classList.remove('hidden');
        document.getElementById('menu-icon-close').classList.add('hidden');
    }
}


// --- DATA FETCH & RENDER ---
function fetchData(token) {
    fetch(`${WEB_APP_URL}?token=${token}`)
        .then(response => response.json())
        .then(data => {
            // Hide Skeleton and show content
            document.getElementById('skeleton-loader').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            
            if (data.status !== 'success' || !data.data) throw new Error(data.error || 'Invalid data from backend.');
            
            portalData = data.data;

            // Render all components
            renderDashboard(portalData.students);
            renderActionsTab(portalData.students);
            populateEventFilter(portalData.allEvents);
            applyAndRenderFilters(); 
            renderMySignups(portalData.volunteerProgress);
            renderMySignupsList(portalData.mySignups);
            renderMobileMenu();
            if (typeof phosphor !== 'undefined') phosphor.replace();
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            const skeleton = document.getElementById('skeleton-loader');
            skeleton.innerHTML = `<div class="text-center"><i class="ph-x-circle text-6xl text-red-500 mx-auto"></i><h2 class="text-2xl font-semibold text-slate-700 mt-4">Failed to Load Portal</h2><p class="text-slate-500">${error.message}</p></div>`;
        });
}

// --- NEW TEMPLATE-BASED RENDERING ---

function renderDashboard(students) {
    const container = document.getElementById('student-content-container');
    container.innerHTML = '';
    if (!students || students.length === 0) {
        // ... handle no students
        return;
    }

    const studentTemplate = document.getElementById('student-card-template');
    const teacherTemplate = document.getElementById('teacher-item-template');

    students.forEach(student => {
        const studentCard = studentTemplate.content.cloneNode(true);
        const studentInitials = student.studentName.split(" ").map(n => n[0]).join("");

        studentCard.querySelector('.student-photo').src = `https://placehold.co/100x100/E2E8F0/4A5568?text=${studentInitials}`;
        studentCard.querySelector('.student-name').textContent = student.studentName;
        studentCard.querySelector('.student-grade').textContent = `${decodeGrade(student.grade)} - Classroom ${student.classroom}`;
        studentCard.querySelector('.report-absence-nav-btn').dataset.studentId = student.uniqueStudentId;

        // Render Teachers using template
        const teachersList = studentCard.querySelector('.teachers-list');
        teachersList.innerHTML = '';
        if (student.teachers && student.teachers.length > 0) {
            student.teachers.forEach(teacher => {
                const teacherItem = teacherTemplate.content.cloneNode(true);
                teacherItem.querySelector('.teacher-photo').src = teacher.photoUrl;
                teacherItem.querySelector('.teacher-photo').alt = teacher.teacherName;
                teacherItem.querySelector('.teacher-name').textContent = teacher.teacherName;
                teacherItem.querySelector('.teacher-role').textContent = teacher.role;
                teacherItem.querySelector('.teacher-email').textContent = teacher.email;
                teacherItem.querySelector('.teacher-email').href = `mailto:${teacher.email}`;
                teachersList.appendChild(teacherItem);
            });
        } else {
            teachersList.innerHTML = '<li><p class="text-slate-500 py-3">No teachers listed.</p></li>';
        }

        // Events rendering can be similarly refactored if needed
        // For now, keeping original logic for brevity
        const eventsList = studentCard.querySelector('.events-list');
        // ... Logic to render events into eventsList ...

        container.appendChild(studentCard);
    });
}

// ... other render functions (renderActionsTab, renderVolunteering, etc.) should be refactored to use templates as well.

// --- EVENT LISTENERS ---
function addEventListeners() {
    document.body.addEventListener('click', function(event) {
        const target = event.target;
        const button = target.closest('button');

        // OPTIMISTIC UI: Volunteer Signup
        if (button && button.matches('.signup-btn')) {
            const opportunityId = button.dataset.id;
            const opportunityCard = button.closest('.bg-white.rounded-xl');
            
            // Immediately disable button and change text
            button.textContent = 'Signing up...';
            button.disabled = true;

            // Optimistically remove from view (can add a fade-out animation)
            if(opportunityCard) opportunityCard.style.opacity = '0.5';

            fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: 'signup', opportunityId: opportunityId, token: ID_TOKEN }),
            }).then(() => {
                showToast('Signup successful! Your lists have been updated.', 'success');
                // On success, do a silent refresh of just the necessary data
                // This is better than a full `fetchData` reload
                fetchData(ID_TOKEN); // For simplicity, we still do a full refresh, but a partial refresh would be the next step.
            }).catch(error => {
                showToast('An error occurred during signup.', 'error');
                // Revert UI on error
                if(opportunityCard) opportunityCard.style.opacity = '1';
                button.textContent = 'Sign Up';
                button.disabled = false;
            });
        }

        // Replaced alert with toast
        if (button && button.matches('#send-notification-btn')) {
            // ... form validation logic ...
            
            fetch(WEB_APP_URL, {
                // ... fetch options
            })
            .then(() => showToast('Absence/Tardy notification sent!', 'success'))
            .catch(error => showToast('Error sending notification.', 'error'))
            .finally(() => { /* reset button state */ });
        }
    });

    // ... all other event listeners ...
}


// --- INITIALIZATION ---
window.onload = function() {
    try {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: true
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-button-container'),
          { theme: "outline", size: "large", width: "300" } 
        );
    } catch (error) {
        // ... error handling ...
    }
};

function handleCredentialResponse(response) {
    ID_TOKEN = response.credential;
    const profile = JSON.parse(atob(ID_TOKEN.split('.')[1]));
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('portal-container').classList.remove('hidden');

    // Show a welcome toast
    showToast(`Welcome, ${profile.given_name}!`, 'success');

    const userInfoHtml = `<div class="flex items-center"><img class="h-8 w-8 rounded-full" src="${profile.picture}" alt=""><div class="ml-3"><div class="text-base font-medium text-slate-800">${profile.name}</div><div class="text-sm font-medium text-slate-500">${profile.email}</div></div></div>`;
    document.getElementById('user-info-desktop').innerHTML = userInfoHtml;
    document.getElementById('user-info-mobile').innerHTML = userInfoHtml;
    
    fetchData(ID_TOKEN);
    // fetchAndRenderResources(); // You would call this as well
    addEventListeners();
}
