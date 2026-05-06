// ==================== INTRO ====================
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('introOverlay');
    const enterBtn = document.getElementById('introEnterBtn');

    if (enterBtn && overlay) {
        enterBtn.addEventListener('click', () => {
            overlay.classList.add('hide');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 650);
        });
    }
});

// ==================== STORAGE ====================
const Storage = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

// ==================== INITIALIZE ====================
function initializeData() {
    if (!Storage.get('subjects')) Storage.set('subjects', []);
    if (!Storage.get('notes')) Storage.set('notes', []);
    if (!Storage.get('activities')) Storage.set('activities', []);
    if (!Storage.get('savedVideos')) Storage.set('savedVideos', []);
    if (!Storage.get('settings')) {
        Storage.set('settings', { name: 'Student', theme: 'light' });
    }
    if (!Storage.get('studyStats')) {
        Storage.set('studyStats', {
            totalMinutes: 0,
            streak: 0,
            lastStudyDate: null,
            sessionsToday: 0,
            todayMinutes: 0,
            todayTopics: 0,
            weeklyMinutes: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
        });
    }
}

// ==================== LIVE STUDY TIMER ====================
let liveStudyInterval = null;
let liveStudySeconds = 0;
let liveStudySubject = 'General';
let isLiveStudying = false;

function startLiveStudy() {
    if (isLiveStudying) return;
    
    liveStudySubject = document.getElementById('liveStudySubject').value || 'General';
    isLiveStudying = true;
    liveStudySeconds = 0;
    
    document.getElementById('liveTimerBar').classList.add('active');
    document.getElementById('liveSubject').textContent = liveStudySubject;
    document.body.classList.add('studying');
    document.getElementById('startLiveStudy').innerHTML = '<i class="fas fa-stop"></i> Studying...';
    document.getElementById('startLiveStudy').disabled = true;
    
    const stats = Storage.get('studyStats');
    const today = new Date().toDateString();
    if (stats.lastStudyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (stats.lastStudyDate === yesterday.toDateString()) {
            stats.streak++;
        } else {
            stats.streak = 1;
        }
        stats.lastStudyDate = today;
        stats.todayMinutes = 0;
        stats.todayTopics = 0;
        stats.sessionsToday = 0;
    }
    Storage.set('studyStats', stats);
    
    liveStudyInterval = setInterval(() => {
        liveStudySeconds++;
        updateLiveTimerDisplay();
        if (liveStudySeconds % 60 === 0) {
            saveLiveStudyProgress();
        }
    }, 1000);
    
    addActivity(`Started studying: ${liveStudySubject}`, '#10B981');
}

function stopLiveStudy() {
    if (!isLiveStudying) return;
    
    clearInterval(liveStudyInterval);
    isLiveStudying = false;
    
    document.getElementById('liveTimerBar').classList.remove('active');
    document.body.classList.remove('studying');
    document.getElementById('startLiveStudy').innerHTML = '<i class="fas fa-play"></i> Start Studying';
    document.getElementById('startLiveStudy').disabled = false;
    
    saveLiveStudyProgress();
    
    addActivity(`Studied ${liveStudySubject} for ${formatTime(liveStudySeconds)}`, '#4F46E5');
    
    const stats = Storage.get('studyStats');
    stats.sessionsToday++;
    Storage.set('studyStats', stats);
    
    liveStudySeconds = 0;
    updateDashboard();
}

function saveLiveStudyProgress() {
    const stats = Storage.get('studyStats');
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    stats.totalMinutes = (stats.totalMinutes || 0) + 1;
    stats.todayMinutes = (stats.todayMinutes || 0) + 1;
    stats.weeklyMinutes[dayName] = (stats.weeklyMinutes[dayName] || 0) + 1;
    
    Storage.set('studyStats', stats);
    updateDashboard();
}

function updateLiveTimerDisplay() {
    document.getElementById('liveTime').textContent = formatTime(liveStudySeconds);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// ==================== NAVIGATION ====================
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) item.classList.add('active');
    });
    
    if (sectionId === 'progress') updateProgressSection();
    if (sectionId === 'subjects') renderSubjects();
    if (sectionId === 'notes') renderNotes();
    if (sectionId === 'youtube') renderSavedVideos();
}

// ==================== MODAL ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    const form = document.getElementById(modalId).querySelector('form');
    if (form) form.reset();
}

// ==================== SUBJECTS ====================
function addSubject(name, color, topics) {
    const subjects = Storage.get('subjects');
    subjects.push({
        id: Date.now(),
        name,
        color,
        topics: topics.map((t, i) => ({ id: i, name: t, completed: false })),
        createdAt: new Date().toISOString()
    });
    Storage.set('subjects', subjects);
    addActivity(`Added subject: ${name}`, color);
    updateDashboard();
    renderSubjects();
    updateSubjectSelects();
}

function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    let subjects = Storage.get('subjects');
    const sub = subjects.find(s => s.id === id);
    subjects = subjects.filter(s => s.id !== id);
    Storage.set('subjects', subjects);
    addActivity(`Deleted: ${sub.name}`, '#EF4444');
    updateDashboard();
    renderSubjects();
    updateSubjectSelects();
}

function toggleTopic(subjectId, topicId) {
    const subjects = Storage.get('subjects');
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject.topics.find(t => t.id === topicId);
    topic.completed = !topic.completed;
    Storage.set('subjects', subjects);
    
    if (topic.completed) {
        addActivity(`Completed: ${topic.name}`, subject.color);
        const stats = Storage.get('studyStats');
        stats.todayTopics = (stats.todayTopics || 0) + 1;
        Storage.set('studyStats', stats);
    }
    
    updateDashboard();
    renderSubjects();
}

function renderSubjects() {
    const subjects = Storage.get('subjects');
    const grid = document.getElementById('subjectsGrid');
    
    if (!subjects.length) {
        grid.innerHTML = '<p class="empty-state">No subjects yet. Add one to get started!</p>';
        return;
    }
    
    grid.innerHTML = subjects.map(sub => {
        const done = sub.topics.filter(t => t.completed).length;
        const total = sub.topics.length;
        const progress = total ? Math.round((done / total) * 100) : 0;
        
        return `
            <div class="subject-card">
                <div class="subject-header" style="background: ${sub.color}">
                    <h3>${sub.name}</h3>
                    <button class="subject-menu" onclick="deleteSubject(${sub.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="subject-body">
                    <div class="subject-stats">
                        <span>${done}/${total} topics</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="subject-progress-bar">
                        <div class="subject-progress-fill" style="width: ${progress}%; background: ${sub.color}"></div>
                    </div>
                    <div class="topic-list">
                        ${sub.topics.map(t => `
                            <div class="topic-item ${t.completed ? 'completed' : ''}">
                                <input type="checkbox" class="topic-checkbox" ${t.completed ? 'checked' : ''} 
                                    onchange="toggleTopic(${sub.id}, ${t.id})" id="t-${sub.id}-${t.id}">
                                <label for="t-${sub.id}-${t.id}">${t.name}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== NOTES ====================
let currentViewedNote = null;

function addNote(title, subject, content) {
    const notes = Storage.get('notes');
    notes.unshift({
        id: Date.now(),
        title,
        subject,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    Storage.set('notes', notes);
    addActivity(`Created note: ${title}`, '#4F46E5');
    renderNotes();
}

function updateNote(id, title, subject, content) {
    const notes = Storage.get('notes');
    const note = notes.find(n => n.id === id);
    note.title = title;
    note.subject = subject;
    note.content = content;
    note.updatedAt = new Date().toISOString();
    Storage.set('notes', notes);
    renderNotes();
}

function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    let notes = Storage.get('notes');
    notes = notes.filter(n => n.id !== id);
    Storage.set('notes', notes);
    renderNotes();
    closeModal('viewNoteModal');
}

function viewNote(id) {
    const notes = Storage.get('notes');
    const note = notes.find(n => n.id === id);
    currentViewedNote = note;
    
    document.getElementById('viewNoteTitle').textContent = note.title;
    document.getElementById('viewNoteSubject').textContent = note.subject || 'General';
    document.getElementById('viewNoteContent').textContent = note.content;
    
    openModal('viewNoteModal');
}

function editNote(id) {
    const notes = Storage.get('notes');
    const note = notes.find(n => n.id === id);
    
    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteSubject').value = note.subject;
    document.getElementById('noteContent').value = note.content;
    
    closeModal('viewNoteModal');
    openModal('noteModal');
}

function renderNotes() {
    const notes = Storage.get('notes');
    const search = document.getElementById('notesSearch')?.value?.toLowerCase() || '';
    const filterSubject = document.getElementById('notesFilterSubject')?.value || '';
    const list = document.getElementById('notesList');
    
    let filtered = notes.filter(n => {
        const matchSearch = n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search);
        const matchSubject = !filterSubject || n.subject === filterSubject;
        return matchSearch && matchSubject;
    });
    
    if (!filtered.length) {
        list.innerHTML = '<p class="empty-state">No notes found</p>';
        return;
    }
    
    list.innerHTML = filtered.map(note => {
        const date = new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="note-card" onclick="viewNote(${note.id})">
                <div class="note-header">
                    <h3>${note.title}</h3>
                </div>
                <span class="note-subject">${note.subject || 'General'}</span>
                <p class="note-content">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>
                <p class="note-date">${date}</p>
            </div>
        `;
    }).join('');
}

// ==================== YOUTUBE ====================
function searchYouTube(query) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
}

function loadYouTubeVideo(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        alert('Invalid YouTube URL. Please paste a valid YouTube video link.');
        return;
    }
    
    const player = document.getElementById('youtubePlayer');
    player.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
    
    saveVideo(videoId, url);
}

function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function saveVideo(videoId, url) {
    const videos = Storage.get('savedVideos');
    if (videos.find(v => v.videoId === videoId)) return;
    
    videos.unshift({
        id: Date.now(),
        videoId,
        url,
        title: `Video ${videos.length + 1}`,
        savedAt: new Date().toISOString()
    });
    
    if (videos.length > 20) videos.pop();
    Storage.set('savedVideos', videos);
    renderSavedVideos();
}

function deleteVideo(id) {
    let videos = Storage.get('savedVideos');
    videos = videos.filter(v => v.id !== id);
    Storage.set('savedVideos', videos);
    renderSavedVideos();
}

function playVideo(videoId) {
    const player = document.getElementById('youtubePlayer');
    player.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allowfullscreen></iframe>`;
}

function renderSavedVideos() {
    const videos = Storage.get('savedVideos');
    const list = document.getElementById('savedVideosList');
    
    if (!videos.length) {
        list.innerHTML = '<p class="empty-state">No saved videos</p>';
        return;
    }
    
    list.innerHTML = videos.map(v => `
        <div class="saved-video-item">
            <img src="https://img.youtube.com/vi/${v.videoId}/default.jpg" class="saved-video-thumb" onclick="playVideo('${v.videoId}')">
            <div class="saved-video-info" onclick="playVideo('${v.videoId}')">
                <h4>${v.title}</h4>
                <span>${new Date(v.savedAt).toLocaleDateString()}</span>
            </div>
            <button class="saved-video-delete" onclick="deleteVideo(${v.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ==================== TIMER ====================
let timerInterval = null;
let timerMinutes = 25;
let timerSeconds = 0;
let isTimerRunning = false;
let currentTimerMode = 'pomodoro';

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    document.getElementById('startTimer').disabled = true;
    document.getElementById('pauseTimer').disabled = false;
    
    timerInterval = setInterval(() => {
        if (timerSeconds === 0) {
            if (timerMinutes === 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                timerComplete();
                return;
            }
            timerMinutes--;
            timerSeconds = 59;
        } else {
            timerSeconds--;
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    document.getElementById('startTimer').disabled = false;
    document.getElementById('pauseTimer').disabled = true;
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    const btn = document.querySelector('.mode-btn.active');
    timerMinutes = parseInt(btn.dataset.time);
    timerSeconds = 0;
    updateTimerDisplay();
    document.getElementById('startTimer').disabled = false;
    document.getElementById('pauseTimer').disabled = true;
}

function updateTimerDisplay() {
    document.getElementById('timerMinutes').textContent = String(timerMinutes).padStart(2, '0');
    document.getElementById('timerSeconds').textContent = String(timerSeconds).padStart(2, '0');
}

function timerComplete() {
    alert('Timer complete! Take a break.');
    
    if (currentTimerMode === 'pomodoro') {
        const stats = Storage.get('studyStats');
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        
        stats.totalMinutes += 25;
        stats.todayMinutes += 25;
        stats.weeklyMinutes[dayName] = (stats.weeklyMinutes[dayName] || 0) + 25;
        stats.sessionsToday++;
        Storage.set('studyStats', stats);
        
        const subject = document.getElementById('timerSubject').value || 'General';
        addActivity(`Completed 25min session: ${subject}`, '#10B981');
        updateDashboard();
    }
    resetTimer();
}

function setTimerMode(mode, time) {
    currentTimerMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    timerMinutes = time;
    timerSeconds = 0;
    updateTimerDisplay();
    if (isTimerRunning) pauseTimer();
}

// ==================== ACTIVITY ====================
function addActivity(message, color) {
    const activities = Storage.get('activities');
    activities.unshift({
        id: Date.now(),
        message,
        color,
        timestamp: new Date().toISOString()
    });
    if (activities.length > 50) activities.pop();
    Storage.set('activities', activities);
    renderActivities();
}

function renderActivities() {
    const activities = Storage.get('activities');
    const list = document.getElementById('activityList');
    
    if (!activities.length) {
        list.innerHTML = '<p class="empty-state">No activity yet</p>';
        return;
    }
    
    list.innerHTML = activities.slice(0, 10).map(a => {
        const ago = getTimeAgo(new Date(a.timestamp));
        return `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${a.color}20; color: ${a.color}">
                    <i class="fas fa-check"></i>
                </div>
                <div class="activity-info">
                    <p>${a.message}</p>
                    <span>${ago}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const secs = Math.floor((new Date() - date) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
}

// ==================== PROGRESS ====================
function updateProgressSection() {
    const subjects = Storage.get('subjects');
    const stats = Storage.get('studyStats');
    
    let total = 0, done = 0;
    subjects.forEach(s => {
        total += s.topics.length;
        done += s.topics.filter(t => t.completed).length;
    });
    
    const progress = total ? Math.round((done / total) * 100) : 0;
    
    const circle = document.getElementById('overallProgressCircle');
    circle.style.background = `conic-gradient(var(--primary) ${progress * 3.6}deg, var(--background) 0deg)`;
    document.getElementById('overallProgressValue').textContent = `${progress}%`;
    
    const progressList = document.getElementById('subjectProgressList');
    if (!subjects.length) {
        progressList.innerHTML = '<p class="empty-state">Add subjects to track</p>';
    } else {
        progressList.innerHTML = subjects.map(s => {
            const d = s.topics.filter(t => t.completed).length;
            const t = s.topics.length;
            const p = t ? Math.round((d / t) * 100) : 0;
            return `
                <div class="subject-progress-item">
                    <div class="subject-progress-header">
                        <span>${s.name}</span>
                        <span>${p}%</span>
                    </div>
                    <div class="subject-progress-bar">
                        <div class="subject-progress-fill" style="width: ${p}%; background: ${s.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    const maxMins = Math.max(...Object.values(stats.weeklyMinutes || {}), 1);
    document.querySelectorAll('.bar').forEach(bar => {
        const day = bar.dataset.day;
        const mins = stats.weeklyMinutes?.[day] || 0;
        const height = (mins / maxMins) * 100;
        bar.querySelector('.bar-fill').style.height = `${Math.max(height, 2)}%`;
    });
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const subjects = Storage.get('subjects');
    const stats = Storage.get('studyStats');
    const settings = Storage.get('settings');
    
    document.getElementById('userName').textContent = settings.name;
    document.getElementById('welcomeName').textContent = settings.name;
    document.getElementById('totalSubjects').textContent = subjects.length;
    
    let done = 0;
    subjects.forEach(s => done += s.topics.filter(t => t.completed).length);
    document.getElementById('completedTopics').textContent = done;
    document.getElementById('studyStreak').textContent = stats.streak || 0;
    document.getElementById('totalHours').textContent = formatMinutes(stats.totalMinutes || 0);
    
    document.getElementById('todayHours').textContent = formatMinutes(stats.todayMinutes || 0);
    document.getElementById('todaySessions').textContent = stats.sessionsToday || 0;
    document.getElementById('todayTopics').textContent = stats.todayTopics || 0;
    document.getElementById('sessionsToday').textContent = stats.sessionsToday || 0;
    
    renderActivities();
}

// ==================== SETTINGS ====================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function saveSettings(name, theme) {
    Storage.set('settings', { name, theme });
    applyTheme(theme);
    updateDashboard();
}

function resetAllData() {
    if (!confirm('Reset all data? This cannot be undone!')) return;
    ['subjects', 'notes', 'activities', 'studyStats', 'settings', 'savedVideos'].forEach(k => Storage.remove(k));
    initializeData();
    location.reload();
}

// ==================== SHARE/EXPORT ====================
function exportData() {
    const data = {
        subjects: Storage.get('subjects'),
        notes: Storage.get('notes'),
        activities: Storage.get('activities'),
        studyStats: Storage.get('studyStats'),
        settings: Storage.get('settings'),
        savedVideos: Storage.get('savedVideos'),
        exportedAt: new Date().toISOString()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyhub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function getShareCode() {
    const data = {
        subjects: Storage.get('subjects'),
        notes: Storage.get('notes'),
        studyStats: Storage.get('studyStats'),
        settings: Storage.get('settings')
    };
    return btoa(JSON.stringify(data));
}

function importData(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (data.subjects) Storage.set('subjects', data.subjects);
        if (data.notes) Storage.set('notes', data.notes);
        if (data.activities) Storage.set('activities', data.activities);
        if (data.studyStats) Storage.set('studyStats', data.studyStats);
        if (data.settings) Storage.set('settings', data.settings);
        if (data.savedVideos) Storage.set('savedVideos', data.savedVideos);
        
        alert('Data imported successfully!');
        location.reload();
    } catch (e) {
        alert('Invalid data format');
    }
}

function importFromCode(code) {
    try {
        const json = atob(code);
        importData(json);
    } catch (e) {
        alert('Invalid code');
    }
}

// ==================== SUBJECT SELECTS ====================
function updateSubjectSelects() {
    const subjects = Storage.get('subjects');
    const selects = ['timerSubject', 'noteSubject', 'liveStudySubject', 'notesFilterSubject'];
    
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        
        const val = sel.value;
        const isFilter = id === 'notesFilterSubject';
        const isLive = id === 'liveStudySubject';
        
        sel.innerHTML = isFilter ? '<option value="">All Subjects</option>' : 
                        isLive ? '<option value="General">General Study</option>' :
                        '<option value="">General</option>';
        
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.name;
            sel.appendChild(opt);
        });
        
        sel.value = val;
    });
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    
    const settings = Storage.get('settings');
    applyTheme(settings.theme);
    document.getElementById('settingsName').value = settings.name;
    document.getElementById('themeSelect').value = settings.theme;
    
    const stats = Storage.get('studyStats');
    const today = new Date().toDateString();
    if (stats.lastStudyDate && stats.lastStudyDate !== today) {
        stats.todayMinutes = 0;
        stats.todayTopics = 0;
        stats.sessionsToday = 0;
        Storage.set('studyStats', stats);
    }
    
    updateDashboard();
    updateSubjectSelects();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            showSection(item.dataset.section);
        });
    });
    
    // Live Study
    document.getElementById('startLiveStudy').addEventListener('click', startLiveStudy);
    document.getElementById('liveStopBtn').addEventListener('click', stopLiveStudy);
    
    // Subject Modal
    document.getElementById('addSubjectBtn').addEventListener('click', () => openModal('subjectModal'));
    document.getElementById('subjectForm').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('subjectName').value.trim();
        const color = document.querySelector('input[name="subjectColor"]:checked').value;
        const topics = document.getElementById('subjectTopics').value.trim().split('\n').filter(t => t.trim());
        if (name) {
            addSubject(name, color, topics);
            closeModal('subjectModal');
        }
    });
    
    // Note Modal
    document.getElementById('addNoteBtn').addEventListener('click', () => {
        document.getElementById('noteModalTitle').textContent = 'Add New Note';
        document.getElementById('noteId').value = '';
        openModal('noteModal');
    });
    
    document.getElementById('noteForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('noteId').value;
        const title = document.getElementById('noteTitle').value.trim();
        const subject = document.getElementById('noteSubject').value;
        const content = document.getElementById('noteContent').value;
        
        if (title) {
            if (id) updateNote(parseInt(id), title, subject, content);
            else addNote(title, subject, content);
            closeModal('noteModal');
        }
    });
    
    // View Note actions
    document.getElementById('editViewedNote').addEventListener('click', () => {
        if (currentViewedNote) editNote(currentViewedNote.id);
    });
    document.getElementById('deleteViewedNote').addEventListener('click', () => {
        if (currentViewedNote) deleteNote(currentViewedNote.id);
    });
    
    // Notes filter
    document.getElementById('notesSearch')?.addEventListener('input', renderNotes);
    document.getElementById('notesFilterSubject')?.addEventListener('change', renderNotes);
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('settingsForm').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('settingsName').value.trim() || 'Student';
        const theme = document.getElementById('themeSelect').value;
        saveSettings(name, theme);
        closeModal('settingsModal');
    });
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);
    
    // Timer
    document.getElementById('startTimer').addEventListener('click', startTimer);
    document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setTimerMode(btn.dataset.mode, parseInt(btn.dataset.time)));
    });
    
    // YouTube
    document.getElementById('youtubeSearchBtn').addEventListener('click', () => {
        const query = document.getElementById('youtubeSearchInput').value.trim();
        if (query) searchYouTube(query);
    });
    document.getElementById('youtubeSearchInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) searchYouTube(query);
        }
    });
    document.getElementById('loadVideoBtn').addEventListener('click', () => {
        const url = document.getElementById('youtubeUrlInput').value.trim();
        if (url) loadYouTubeVideo(url);
    });
    document.querySelectorAll('.topic-tag').forEach(tag => {
        tag.addEventListener('click', () => searchYouTube(tag.dataset.query));
    });
    
    // Share/Import
    document.getElementById('shareBtn').addEventListener('click', () => {
        document.getElementById('shareCode').value = getShareCode();
        openModal('shareModal');
    });
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
        document.getElementById('shareCode').select();
        document.execCommand('copy');
        alert('Code copied!');
    });
    
    document.getElementById('importBtn').addEventListener('click', () => openModal('importModal'));
    document.getElementById('importDataBtn').addEventListener('click', () => {
        const file = document.getElementById('importFile').files[0];
        const code = document.getElementById('importCode').value.trim();
        
        if (file) {
            const reader = new FileReader();
            reader.onload = e => importData(e.target.result);
            reader.readAsText(file);
        } else if (code) {
            importFromCode(code);
        } else {
            alert('Please select a file or paste a code');
        }
    });
    
    // Modal close on backdrop
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
        }
    });
});

// Global functions
window.showSection = showSection;
window.closeModal = closeModal;
window.deleteSubject = deleteSubject;
window.toggleTopic = toggleTopic;
window.deleteNote = deleteNote;
window.viewNote = viewNote;
window.editNote = editNote;
window.playVideo = playVideo;
window.deleteVideo = deleteVideo;
