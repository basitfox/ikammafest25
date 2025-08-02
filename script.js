// Ganti dengan kunci API Anda dari Google Cloud Console
const API_KEY = 'AIzaSyBuYVjue7XxG7UEZBiO0mCg3y1JKV4HilA';

// Ganti dengan ID Spreadsheet untuk data RAB
const RAB_SPREADSHEET_ID = '1WIonr2zdeR9ZNDVAgX0EcvsRGIKnOQTrHAgqygU50ZM';

// Ganti dengan ID Spreadsheet untuk data Home, Todo, dan File
const MAIN_SPREADSHEET_ID = '1y7hMfdLfgkRS3POqUMj5_9kdzpsOm22_ASmaUMf4G_A';

// Nama sheet yang berisi data
const DASHBOARD_SHEET = 'Dashboard';
const PEMASUKAN_SHEET = 'Pemasukan';
const PENGELUARAN_SHEET = 'Pengeluaran';
const ACARA_SHEET = 'Acara';
const TODO_SHEET = 'Todo';
const FILE_SHEET = 'File';
const AUDIO_SHEET = 'Audio';

// Definisikan rentang data RAB
const DASHBOARD_RANGES = [
    `${DASHBOARD_SHEET}!C6`,          // Total Saldo
    `${DASHBOARD_SHEET}!C16`,         // Total Pemasukan
    `${DASHBOARD_SHEET}!F18`,         // Total Pengeluaran
    `${DASHBOARD_SHEET}!B20:B29`,     // Kategori Pengeluaran
    `${DASHBOARD_SHEET}!D20:D29`,     // Budget
    `${DASHBOARD_SHEET}!H20:H29`,     // Spent
    `${DASHBOARD_SHEET}!M20:M29`      // Persentase
];

// --- FUNGSI UTILITY GLOBAL ---
function showSpinner(spinnerId) {
    const spinnerElement = document.getElementById(spinnerId);
    if (spinnerElement) {
        spinnerElement.style.display = 'block';
    }
}

function hideSpinner(spinnerId) {
    const spinnerElement = document.getElementById(spinnerId);
    if (spinnerElement) {
        spinnerElement.style.display = 'none';
    }
}

function showSnackbar(isSuccess, message) {
    const snackbar = document.getElementById('snackbar');
    const snackbarIcon = document.querySelector('#snackbar .snackbar-icon');
    const snackbarMessage = document.getElementById('snackbarMessage');

    snackbar.classList.remove('snackbar-success', 'snackbar-error');
    snackbarIcon.textContent = '';
    snackbarMessage.textContent = message;

    if (isSuccess) {
        snackbar.classList.add('snackbar-success');
        snackbarIcon.textContent = 'check_circle';
    } else {
        snackbar.classList.add('snackbar-error');
        snackbarIcon.textContent = 'error';
    }

    snackbar.classList.add('show');

    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3000);
}

// --- NAVIGASI DAN PENGELOLAAN HALAMAN ---
function showPage(pageId) {
    // Stop audio jika ada yang sedang diputar saat pindah halaman
    if (currentAudioPlayer) {
        stopAudio();
    }

    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    if (pageId === 'rabPage') {
        loadAllInitialRABData();
    } else if (pageId === 'todoPage') {
        loadTodoPageData();
    } else if (pageId === 'filePage') {
        loadFilePageData();
    } else if (pageId === 'homePage') {
        loadHomePageData();
    } else if (pageId === 'audioPage') {
        loadAudioPageData();
    }
}

// Fungsi untuk mengelola tab
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));

    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// --- FUNGSI GAPI & INISIALISASI ---
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

function initializeGapiClient() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        // Muat data awal untuk halaman Home saat GAPI siap
        loadHomePageData();
    }).catch(error => {
        console.error('Error initializing GAPI client:', error);
        showSnackbar(false, 'Gagal menginisialisasi Google API: ' + error.message);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.dataset.page;
            showPage(pageId);
        });
    });

    const modal = document.getElementById('eventDetailModal');
    const closeBtn = document.querySelector('.close-button');

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});


// --- HALAMAN RAB ---
function displayList(data, containerId, type) {
    const listContainer = document.getElementById(containerId);
    listContainer.innerHTML = '';
    
    if (!data || data.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: var(--light-text-color);">Belum ada data ${type}.</p>`;
        return;
    }

    data.forEach(item => {
        const listItem = document.createElement('div');
        listItem.classList.add('list-item');
        let nominalClass = '';
        let nominalValue = '';
        let chipsHTML = '';

        if (type === 'pemasukan') {
            nominalClass = 'pemasukan';
            nominalValue = item.Nominal;
            chipsHTML = `
                <span class="list-chip"><span class="material-symbols-rounded">book</span>${item.Kategori}</span>
                <span class="list-chip"><span class="material-symbols-rounded">account_balance_wallet</span>${item['Kas Tujuan']}</span>
                ${item.PJ ? `<span class="list-chip"><span class="material-symbols-rounded">account_circle</span>${item.PJ}</span>` : ''}
                ${item['Bukti Foto Link'] ? `
                    <a href="${item['Bukti Foto Link']}" target="_blank" class="proof-chip">
                        <span class="material-symbols-rounded">image</span>
                        Bukti
                    </a>
                ` : ''}
            `;
        } else if (type === 'pengeluaran') {
            nominalClass = 'pengeluaran';
            nominalValue = item.Nominal;
            chipsHTML = `
                <span class="list-chip"><span class="material-symbols-rounded">book</span>${item.Kategori}</span>
                <span class="list-chip"><span class="material-symbols-rounded">account_balance_wallet</span>${item['Kas Sumber']}</span>
                ${item.Pemakai ? `<span class="list-chip"><span class="material-symbols-rounded">account_circle</span>${item.Pemakai}</span>` : ''}
                ${item['Bukti Foto Link'] ? `
                    <a href="${item['Bukti Foto Link']}" target="_blank" class="proof-chip">
                        <span class="material-symbols-rounded">image</span>
                        Bukti
                    </a>
                ` : ''}
            `;
        }

        listItem.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-date">${item.Date}</span>
                <span class="list-item-nominal ${nominalClass}">${nominalValue}</span>
            </div>
            <div class="list-item-description">${item.Keterangan}</div>
            <div class="list-item-chips">${chipsHTML}</div>
        `;
        listContainer.appendChild(listItem);
    });
}

function loadAllInitialRABData() {
    loadDashboardData();
    loadPemasukanList(5);
    loadPengeluaranList(5);
}

function loadAllTransactions() {
    loadPemasukanList(); 
    loadPengeluaranList();
}

function loadDashboardData() {
    showSpinner('rabSpinner');
    showSpinner('infoBoxSpinner');
    showSpinner('categoryExpensesSpinner');

    gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: RAB_SPREADSHEET_ID,
        ranges: DASHBOARD_RANGES,
    }).then(response => {
        updateDashboard(response);
    }).catch(error => {
        console.error('Error fetching dashboard data:', error);
        showSnackbar(false, 'Gagal memuat data dashboard: ' + error.message);
    }).finally(() => {
        hideSpinner('rabSpinner');
        hideSpinner('infoBoxSpinner');
        hideSpinner('categoryExpensesSpinner');
    });
}

function updateDashboard(data) {
    const totalSaldo = data.result.valueRanges[0].values ? data.result.valueRanges[0].values[0][0] : 'N/A';
    document.getElementById('totalSaldo').textContent = totalSaldo;

    const totalPemasukan = data.result.valueRanges[1].values ? data.result.valueRanges[1].values[0][0] : 'N/A';
    const totalPengeluaran = data.result.valueRanges[2].values ? data.result.valueRanges[2].values[0][0] : 'N/A';
    document.getElementById('totalPemasukan').textContent = totalPemasukan;
    document.getElementById('totalPengeluaran').textContent = totalPengeluaran;

    const categories = data.result.valueRanges[3].values ? data.result.valueRanges[3].values.flat() : [];
    const budgets = data.result.valueRanges[4].values ? data.result.valueRanges[4].values.flat() : [];
    const spent = data.result.valueRanges[5].values ? data.result.valueRanges[5].values.flat() : [];
    const percentages = data.result.valueRanges[6].values ? data.result.valueRanges[6].values.flat() : [];
    const categoryExpensesTbody = document.getElementById('categoryExpenses');
    categoryExpensesTbody.innerHTML = '';
    categories.forEach((cat, index) => {
        if (cat) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${cat}
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentages[index]};"></div>
                    </td>
                <td>${budgets[index]}</td>
                <td>${spent[index]}</td>
            `;
            categoryExpensesTbody.appendChild(row);
        }
    });
}


function loadPemasukanList(limit) {
    showSpinner('pemasukanListSpinner');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: RAB_SPREADSHEET_ID,
        range: `${PEMASUKAN_SHEET}!A:G`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            let data = values.slice(1);
            const parsedData = data.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            }).reverse();
            const dataToDisplay = limit ? parsedData.slice(0, limit) : parsedData;
            displayList(dataToDisplay, 'pemasukanList', 'pemasukan');

        } else {
            displayList([], 'pemasukanList', 'pemasukan');
        }
    }).catch(error => {
        console.error('Error fetching pemasukan list:', error);
        showSnackbar(false, 'Gagal memuat daftar pemasukan: ' + error.message);
    }).finally(() => {
        hideSpinner('pemasukanListSpinner');
    });
}

function loadPengeluaranList(limit) {
    showSpinner('pengeluaranListSpinner');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: RAB_SPREADSHEET_ID,
        range: `${PENGELUARAN_SHEET}!A:G`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            let data = values.slice(1);
            const parsedData = data.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            }).reverse();
            const dataToDisplay = limit ? parsedData.slice(0, limit) : parsedData;
            displayList(dataToDisplay, 'pengeluaranList', 'pengeluaran');

        } else {
            displayList([], 'pengeluaranList', 'pengeluaran');
        }
    }).catch(error => {
        console.error('Error fetching pengeluaran list:', error);
        showSnackbar(false, 'Gagal memuat daftar pengeluaran: ' + error.message);
    }).finally(() => {
        hideSpinner('pengeluaranListSpinner');
    });
}


// --- HALAMAN HOME (ACARA) ---
function parseDate(dateString, timeString) {
    if (!dateString) return null;
    const parts = dateString.split('/').map(Number);
    const [day, month, year] = parts.length === 3 ? parts : [null, null, null];
    let [hour, minute] = [0, 0];
    if (timeString) {
      const timeParts = timeString.split(':').map(Number);
      if (timeParts.length === 2) {
        [hour, minute] = timeParts;
      }
    }
    return new Date(year, month - 1, day, hour, minute);
}

// Fungsi utility untuk menghitung perbedaan waktu
function getTimeDifference(date1, date2) {
    const diffInMs = Math.abs(date1 - date2);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
        return `${diffInMinutes} menit lagi`;
    }
    if (diffInHours < 24) {
        return `${diffInHours} jam lagi`;
    }
    return `${diffInDays} hari lagi`;
}


function loadHomePageData() {
    showSpinner('ongoingSpinner');
    showSpinner('upcomingSpinner');
    showSpinner('pastSpinner');
    
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${ACARA_SHEET}!A:H`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            const data = values.slice(1);
            const events = data.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            
            // Menyortir acara dari yang paling awal
            events.sort((a, b) => {
                const dateA = parseDate(a['Start Date'], a['Start time']);
                const dateB = parseDate(b['Start Date'], b['Start time']);
                return dateA - dateB;
            });

            renderEvents(events);
        } else {
            renderEvents([]);
        }
    }).catch(error => {
        console.error('Error fetching acara list:', error);
        showSnackbar(false, 'Gagal memuat daftar acara: ' + error.message);
    }).finally(() => {
        hideSpinner('ongoingSpinner');
        hideSpinner('upcomingSpinner');
        hideSpinner('pastSpinner');
    });
}

function renderEvents(events) {
    const ongoingList = document.getElementById('ongoingEventsList');
    const upcomingList = document.getElementById('upcomingEventsList');
    const pastList = document.getElementById('pastEventsList');

    ongoingList.innerHTML = '';
    upcomingList.innerHTML = '';
    pastList.innerHTML = '';

    const now = new Date();

    events.forEach(event => {
        const startDate = parseDate(event['Start Date'], event['Start time']);
        const endDate = parseDate(event['End date'], event['End Time']);
        let eventType;
        let statusChipText = '';

        if (now >= startDate && now <= endDate) {
            eventType = 'ongoing';
            statusChipText = 'Berlangsung';
        } else if (now < startDate) {
            eventType = 'upcoming';
            statusChipText = getTimeDifference(now, startDate);
        } else {
            eventType = 'past';
            statusChipText = 'Selesai';
        }

        const card = document.createElement('div');
        card.classList.add('event-card', eventType);
        card.innerHTML = `
            <div class="event-card-date">
                <span class="day">${startDate.getDate()}</span>
                <span class="month">${startDate.toLocaleString('id-ID', { month: 'short' })}</span>
            </div>
            <div class="event-card-content">
                <h3 class="event-card-title">${event.Acara}</h3>
                <div class="event-card-chips">
                    <span class="list-chip"><span class="material-symbols-rounded">location_on</span>${event.Lokasi}</span>
                    <span class="list-chip"><span class="material-symbols-rounded">schedule</span>${event['Start time']} - ${event['End Time']}</span>
                </div>
                <span class="event-status-chip ${eventType}">${statusChipText}</span>
            </div>
        `;
        card.addEventListener('click', () => showEventDetailModal(event));

        if (eventType === 'ongoing') ongoingList.appendChild(card);
        else if (eventType === 'upcoming') upcomingList.appendChild(card);
        else pastList.appendChild(card);
    });
}

function showEventDetailModal(event) {
    const modal = document.getElementById('eventDetailModal');
    const modalBody = document.getElementById('modalBody');
    
    const startDate = parseDate(event['Start Date'], event['Start time']);
    const endDate = parseDate(event['End date'], event['End Time']);
    const now = new Date();
    let eventType;
    let statusChipText = '';

    if (now >= startDate && now <= endDate) {
        eventType = 'ongoing';
        statusChipText = 'Berlangsung';
    } else if (now < startDate) {
        eventType = 'upcoming';
        statusChipText = getTimeDifference(now, startDate);
    } else {
        eventType = 'past';
        statusChipText = 'Selesai';
    }

    const detailText = event.Detail.replace(/\n/g, '<br>');

    modalBody.innerHTML = `
        <span class="event-status-chip ${eventType}">${statusChipText}</span>
        <img src="${event.Image}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/333333?text=No+Image+Available';" alt="${event.Acara}">
        <h3>${event.Acara}</h3>
        <div class="modal-detail-row"><span class="material-symbols-rounded">event</span> <p>${event['Start Date']} - ${event['End date']}</p></div>
        <div class="modal-detail-row"><span class="material-symbols-rounded">schedule</span> <p>${event['Start time']} - ${event['End Time']}</p></div>
        <div class="modal-detail-row"><span class="material-symbols-rounded">location_on</span> <p>${event.Lokasi}</p></div>
        <h4>Detail Kegiatan</h4>
        <p>${detailText}</p>
    `;

    modal.style.display = "block";
}

// --- HALAMAN TODO ---
function loadTodoPageData() {
    showSpinner('todoSpinner');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${TODO_SHEET}!A:E`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            const data = values.slice(1);
            const todos = data.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            renderTodos(todos);
        } else {
            renderTodos([]);
        }
    }).catch(error => {
        console.error('Error fetching todo list:', error);
        showSnackbar(false, 'Gagal memuat daftar todo: ' + error.message);
    }).finally(() => {
        hideSpinner('todoSpinner');
    });
}

function renderTodos(todos) {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    const categorizedTodos = todos.reduce((acc, todo) => {
        const category = todo.Kategori || 'Lain-lain';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(todo);
        return acc;
    }, {});

    for (const category in categorizedTodos) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('todo-list-category');
        categoryDiv.innerHTML = `<h3 class="category-header">${category}</h3>`;

        categorizedTodos[category].forEach(todo => {
            const isCompleted = todo.check && todo.check.toUpperCase() === 'TRUE';
            
            const todoItem = document.createElement('div');
            todoItem.classList.add('todo-item');
            if (isCompleted) todoItem.classList.add('completed');
            
            let chipsHTML = '';
            if (todo.PIC) {
                chipsHTML += `<span class="list-chip"><span class="material-symbols-rounded">person</span>${todo.PIC}</span>`;
            }
            if (todo.Date) {
                chipsHTML += `<span class="list-chip"><span class="material-symbols-rounded">event</span>${todo.Date}</span>`;
            }

            todoItem.innerHTML = `
                <span class="material-symbols-rounded todo-item-check ${isCompleted ? 'checked' : ''}">
                    ${isCompleted ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <div class="todo-item-content">
                    <div class="todo-item-title">${todo.Task}</div>
                </div>
                <div class="todo-item-chips">${chipsHTML}</div>
            `;
            categoryDiv.appendChild(todoItem);
        });
        todoList.appendChild(categoryDiv);
    }
}

// --- HALAMAN FILE ---
function loadFilePageData() {
    showSpinner('fileSpinner');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${FILE_SHEET}!A:C`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            const data = values.slice(1);
            const files = data.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            renderFiles(files);
        } else {
            renderFiles([]);
        }
    }).catch(error => {
        console.error('Error fetching file list:', error);
        showSnackbar(false, 'Gagal memuat daftar file: ' + error.message);
    }).finally(() => {
        hideSpinner('fileSpinner');
    });
}

function renderFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    const categorizedFiles = files.reduce((acc, file) => {
        const category = file.Kategori || 'Lain-lain';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(file);
        return acc;
    }, {});

    for (const category in categorizedFiles) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('file-list-category');
        categoryDiv.innerHTML = `<h3 class="category-header">${category}</h3>`;

        categorizedFiles[category].forEach(file => {
            let iconName = 'description';
            if (file.Kategori && file.Kategori.toLowerCase() === 'image') {
                iconName = 'image';
            } else if (file.Kategori && file.Kategori.toLowerCase() === 'design') {
                iconName = 'palette';
            }
            
            const hasLink = file.Link && file.Link.trim() !== '';
            const fileItem = document.createElement(hasLink ? 'a' : 'div');
            fileItem.classList.add('file-item');
            
            if (!hasLink) {
                fileItem.classList.add('empty-link');
            } else {
                fileItem.href = file.Link;
                fileItem.target = '_blank';
            }
            
            fileItem.innerHTML = `
                <span class="material-symbols-rounded file-item-icon">${iconName}</span>
                <div class="file-item-details">
                    <div class="file-item-description">${file.Keterangan}</div>
                </div>
                ${hasLink ? '<span class="material-symbols-rounded">chevron_right</span>' : ''}
            `;
            categoryDiv.appendChild(fileItem);
        });
        fileList.appendChild(categoryDiv);
    }
}


// --- HALAMAN AUDIO ---
let currentAudioPlayer = null;
let currentPlayingButton = null;
let currentPlayingItem = null;
let isPlaying = false;
let currentPlaylist = [];
let currentPlaylistIndex = -1;
let currentTotalDuration = 0;
let timeElapsedInPlaylist = 0;
let nextAudioLoaded = false;


function parseTimeInSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}


function loadAudioPageData() {
    showSpinner('audioSpinner');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MAIN_SPREADSHEET_ID,
        range: `${AUDIO_SHEET}!A:G`,
    }).then(response => {
        const values = response.result.values;
        if (values && values.length > 1) {
            const headers = values[0];
            const audioData = values.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            renderAudioList(audioData);
        } else {
            renderAudioList([]);
        }
    }).catch(error => {
        console.error('Error fetching audio list:', error);
        showSnackbar(false, 'Gagal memuat daftar audio: ' + error.message);
    }).finally(() => {
        hideSpinner('audioSpinner');
    });
}

function renderAudioList(audioData) {
    const audioListContainer = document.getElementById('audioGroupedList');
    audioListContainer.innerHTML = '';

    if (!audioData || audioData.length === 0) {
        audioListContainer.innerHTML = `<p style="text-align: center; color: var(--light-text-color);">Belum ada data audio.</p>`;
        return;
    }

    const filteredAudioData = audioData.filter(item => {
        return item.Tampil && item.Tampil.toUpperCase() === 'TRUE';
    });

    const categorizedAudio = filteredAudioData.reduce((acc, audio) => {
        const category = audio.Kategori || 'Lain-lain';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(audio);
        return acc;
    }, {});

    for (const category in categorizedAudio) {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('todo-list-category');
        categoryDiv.innerHTML = `<h3 class="category-header">${category}</h3>`;
        
        const categoryContent = document.createElement('div');
        categoryContent.classList.add('list-view');

        categorizedAudio[category].forEach(item => {
            const audioItem = document.createElement('div');
            audioItem.classList.add('audio-item');
            
            const audioUrls = [
                item.audio1,
                item.audio2,
                item.audio3,
                item.audio4
            ].filter(url => url);
    
            const playButton = document.createElement('button');
            playButton.classList.add('audio-player-button');
            playButton.innerHTML = `<span class="material-symbols-rounded">play_arrow</span>`;
            
            const progressBarHTML = `
                <div class="audio-item-footer">
                    <div class="audio-progress-line"></div>
                    <div class="audio-time-info">
                        <span class="audio-current-time">0:00</span> / <span class="audio-total-duration">0:00</span>
                    </div>
                </div>
            `;
            audioItem.innerHTML = `<div class="audio-item-title">${item.Nama}</div>`;
            audioItem.appendChild(playButton);
            audioItem.insertAdjacentHTML('beforeend', progressBarHTML);
            
            if (audioUrls.length > 0) {
                // Pra-load hanya metadata untuk total durasi
                preloadTotalDuration(audioUrls, audioItem);
                playButton.addEventListener('click', () => {
                    handleAudioControl(audioUrls, playButton, audioItem);
                });
            } else {
                playButton.disabled = true;
                playButton.style.opacity = '0.5';
                playButton.style.cursor = 'not-allowed';
            }
            
            categoryContent.appendChild(audioItem);
        });

        categoryDiv.appendChild(categoryContent);
        audioListContainer.appendChild(categoryDiv);
    }
}

function preloadTotalDuration(urls, audioItem) {
    let totalDuration = 0;
    let loadedCount = 0;
    const audios = urls.map(url => new Audio(url));

    audios.forEach(audio => {
        audio.preload = 'metadata';
        audio.addEventListener('loadedmetadata', () => {
            totalDuration += audio.duration;
            loadedCount++;
            if (loadedCount === urls.length) {
                const durationElement = audioItem.querySelector('.audio-total-duration');
                if (durationElement) {
                    durationElement.textContent = formatTime(totalDuration);
                }
                audioItem.dataset.totalDuration = totalDuration;
            }
        });
        audio.addEventListener('error', () => {
            loadedCount++;
            if (loadedCount === urls.length) {
                 const durationElement = audioItem.querySelector('.audio-total-duration');
                 if (durationElement) {
                     durationElement.textContent = 'N/A';
                 }
            }
        });
    });
}

function handleAudioControl(urls, button, audioItem) {
    const icon = button.querySelector('.material-symbols-rounded');

    if (currentAudioPlayer && currentPlayingButton === button) {
        if (isPlaying) {
            currentAudioPlayer.pause();
            isPlaying = false;
            icon.textContent = 'play_arrow';
            audioItem.classList.remove('playing');
        } else {
            currentAudioPlayer.play();
            isPlaying = true;
            icon.textContent = 'pause';
            audioItem.classList.add('playing');
        }
    } else {
        if (currentAudioPlayer) {
            stopAudio();
        }
        
        currentPlaylist = urls;
        currentPlaylistIndex = 0;
        currentPlayingButton = button;
        currentPlayingItem = audioItem;
        isPlaying = true;
        nextAudioLoaded = false;
        
        icon.textContent = 'pause';
        audioItem.classList.add('playing');
        
        playNextAudioInPlaylist();
    }
}

function playNextAudioInPlaylist() {
    if (!isPlaying || currentPlaylistIndex >= currentPlaylist.length) {
        stopAudio();
        return;
    }
    
    const audioUrl = currentPlaylist[currentPlaylistIndex];
    currentAudioPlayer = new Audio(audioUrl);
    currentAudioPlayer.play();
    
    const audioItem = currentPlayingItem;

    currentAudioPlayer.addEventListener('timeupdate', () => {
        const currentTimeInPlaylist = timeElapsedInPlaylist + currentAudioPlayer.currentTime;
        const totalDuration = parseFloat(audioItem.dataset.totalDuration) || 0;
        const progress = (currentTimeInPlaylist / totalDuration) * 100;
        audioItem.querySelector('.audio-progress-line').style.width = `${progress}%`;
        audioItem.querySelector('.audio-current-time').textContent = formatTime(currentTimeInPlaylist);

        // Logika lazy loading: memuat file berikutnya saat file ini mencapai 50%
        if (!nextAudioLoaded && currentPlaylistIndex + 1 < currentPlaylist.length) {
            if (currentAudioPlayer.currentTime >= currentAudioPlayer.duration * 0.5) {
                const nextAudioUrl = currentPlaylist[currentPlaylistIndex + 1];
                const nextAudio = new Audio(nextAudioUrl);
                nextAudio.preload = 'metadata';
                nextAudioLoaded = true;
                console.log(`Preloading next audio: ${nextAudioUrl}`);
            }
        }
    });
    
    currentAudioPlayer.addEventListener('ended', () => {
        timeElapsedInPlaylist += currentAudioPlayer.duration;
        currentPlaylistIndex++;
        nextAudioLoaded = false; // Reset flag untuk file berikutnya
        playNextAudioInPlaylist();
    });

    currentAudioPlayer.addEventListener('error', (e) => {
        console.error('Error playing audio:', e);
        showSnackbar(false, `Gagal memutar audio: ${audioUrl}.`);
        timeElapsedInPlaylist += (currentAudioPlayer.duration || 0);
        currentPlaylistIndex++;
        nextAudioLoaded = false;
        playNextAudioInPlaylist();
    });
}

function stopAudio() {
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer.currentTime = 0;
        currentAudioPlayer = null;
    }
    isPlaying = false;
    currentPlaylist = [];
    currentPlaylistIndex = -1;
    timeElapsedInPlaylist = 0;
    currentTotalDuration = 0;
    nextAudioLoaded = false;

    if (currentPlayingButton) {
        const icon = currentPlayingButton.querySelector('.material-symbols-rounded');
        icon.textContent = 'play_arrow';
        currentPlayingButton = null;
    }
    if (currentPlayingItem) {
        currentPlayingItem.classList.remove('playing');
        currentPlayingItem.querySelector('.audio-progress-line').style.width = '0%';
        currentPlayingItem.querySelector('.audio-current-time').textContent = '0:00';
        currentPlayingItem.querySelector('.audio-total-duration').textContent = '0:00';
        currentPlayingItem = null;
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}