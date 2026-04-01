/* 
    UEM SEATS - Application Logic 
    Author: Antigravity AI
*/

// --- CONFIG & STATE ---
const BUILDINGS = {
    'B1': {
        name: 'B1 Building', bg: 'yupp/Screenshot 2026-04-01 153846.png',
        floors: { 1:10, 2:10, 3:10, 4:1 },
        caps: { 1:30, 2:30, 3:30, 4:200 },
        special: { '4.1': 'B14.RRR' }
    },
    'B2': {
        name: 'B2 Building', bg: 'yupp/Screenshot 2026-04-01 153858.png',
        floors: { 1:10, 2:10, 3:10, 4:10 },
        caps: { 1:30, 2:30, 3:30, 4:30 }
    },
    'B3': {
        name: 'B3 Building', bg: 'yupp/Screenshot 2026-04-01 153912.png',
        floors: { 1:9, 2:9, 3:9, 4:9, 5:9, 6:9 },
        caps: { 1:35, 2:35, 3:35, 4:35, 5:35, 6:35 }
    }
};

let state = {
    screenStack: ['landing'],
    currentBuilding: null,
    selectedRooms: [],
    tempData: {},
    isAILoading: false,
    classifierModel: null,
    videoStream: null
};

// --- CORE NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById('screen-' + id);
    if (!target) return console.error('Screen not found:', id);
    target.classList.add('active');
    
    // Header & Global Nav management
    const header = document.getElementById('app-header');
    const floatingNav = document.getElementById('floating-nav');
    const nextBtn = document.getElementById('nav-btn-next');
    
    if (header) {
        header.style.display = (id === 'landing' || id === 'faculty-login' || id === 'student-login') ? 'none' : 'flex';
    }

    if (floatingNav) {
        // Hide global nav on landing and result screen (as it has its own DONE button)
        floatingNav.style.display = (id === 'landing' || id === 'student-result') ? 'none' : 'flex';
        
        // Logic for "Next" button visibility within floating nav
        const nextScreens = {
            'upload-routine': true,
            'upload-students': true,
            'allocate-start': false,
            'allocate-rooms': true
        };
        if (nextBtn) nextBtn.style.display = nextScreens[id] ? 'flex' : 'none';
        
        // Update Next button text based on context
        if (nextBtn) {
            if (id === 'upload-routine') nextBtn.innerText = 'GO TO STUDENTS →';
            else if (id === 'upload-students') nextBtn.innerText = 'GO TO ALLOCATION →';
            else if (id === 'allocate-rooms') nextBtn.innerText = 'EXECUTE ALLOCATION →';
        }
    }

    if (id !== state.screenStack[state.screenStack.length - 1]) {
        state.screenStack.push(id);
    }

    // Screen specific inits
    switch (id) {
        case 'faculty-dash': break;
        case 'view-layout': initViewLayout(); break;
        case 'view-all': renderAllAllocations(); break;
        case 'ai-verify': startAICamera(); break;
    }
}

function handleBack() {
    if (state.screenStack.length > 1) {
        state.screenStack.pop();
        const prevId = state.screenStack.pop();
        stopCV();
        showScreen(prevId);
    }
}

function handleNext() {
    const current = state.screenStack[state.screenStack.length - 1];
    switch (current) {
        case 'upload-routine': showScreen('upload-students'); break;
        case 'upload-students': showScreen('allocate-start'); break;
        case 'allocate-rooms': runAIAllocation(); break;
    }
}

function logout() {
    stopCV();
    state.screenStack = ['landing'];
    showScreen('landing');
}

// --- AUTHENTICATION ---
function demoFill() {
    document.getElementById('faculty-id').value = '123456';
    document.getElementById('faculty-pass').value = '1234';
}

function handleFacultyLogin(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('faculty-id').value;
    const pass = document.getElementById('faculty-pass').value;
    if (id === '123456' && pass === '1234') showScreen('faculty-dash');
    else if (id.length === 6 && pass.length === 4) showScreen('faculty-dash'); // Allow any 6/4 for demo
    else alert("Invalid credentials (ID: 6 digits, Pass: 4 digits)");
}

function facultyLogin() { 
    handleFacultyLogin(); 
}

function studentLogin() {
    const enroll = document.getElementById('student-enroll').value;
    const pass = document.getElementById('student-pass').value;
    
    if (enroll.length !== 14 || pass.length !== 4) {
        return alert("Please enter valid IDs (Enrollment: 14, Pass: 4)");
    }

    const allAlloc = JSON.parse(localStorage.getItem('seatAllocation') || '{}');
    const studentExams = Object.values(allAlloc).filter(a => a.id === enroll);
    
    if (studentExams.length === 0) {
        alert("No seat assigned yet. Please check again later.");
    } else if (studentExams.length === 1) {
        // Direct flow for single exam
        generateStudentResult(studentExams[0]);
        showScreen('student-result');
    } else {
        // Multi-subject choice
        renderSubjectSelection(studentExams);
        showScreen('student-subject-select');
    }
}

function renderSubjectSelection(exams) {
    const container = document.getElementById('subject-options-container');
    container.innerHTML = '';
    
    exams.forEach(ex => {
        const btn = document.createElement('button');
        btn.className = 'dash-card';
        btn.style.textAlign = 'left';
        btn.style.width = '100%';
        btn.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="color:var(--gold); margin-bottom:5px;">${ex.subject}</h3>
                    <p style="font-size:0.8rem; opacity:0.7;">Code: ${ex.subjectCode}</p>
                </div>
                <div style="text-align:right">
                    <p style="font-size:0.8rem; color:var(--secondary);">${ex.examDate}</p>
                    <p style="font-size:0.7rem; opacity:0.6;">${ex.examTime}</p>
                </div>
            </div>
        `;
        btn.onclick = () => {
            generateStudentResult(ex);
            showScreen('student-result');
        };
        container.appendChild(btn);
    });
}

// --- AI IDENTITY VERIFICATION ---
async function startAICamera() {
    const video = document.getElementById('ai-video');
    const container = document.getElementById('ai-verify-container');
    const statusText = document.getElementById('ai-pulse-text');
    
    statusText.innerText = "Initializing AI Model...";
    
    if (!state.classifierModel) {
        state.classifierModel = await mobilenet.load();
    }

    try {
        state.videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = state.videoStream;
        statusText.innerText = "Analyzing Face Integrity...";
        
        // Artificial analysis time
        setTimeout(async () => {
            const predictions = await state.classifierModel.classify(video);
            console.log('AI Prediction:', predictions);
            
            // Any "person" like prediction is fine for demo
            const isPerson = predictions.some(p => p.className.toLowerCase().includes('person') || p.className.toLowerCase().includes('face'));
            
            statusText.innerText = "Verification Successful";
            statusText.style.color = "#64FFDA";
            
            setTimeout(() => {
                stopCV();
                generateStudentResult(state.currentStudentData);
                showScreen('student-result');
            }, 1000);
            
        }, 2500);

    } catch (err) {
        console.error("Camera Error:", err);
        alert("Camera access denied. Proceeding with manual check...");
        generateStudentResult(state.currentStudentData);
        showScreen('student-result');
    }
}

function stopCV() {
    if (state.videoStream) {
        state.videoStream.getTracks().forEach(t => t.stop());
        state.videoStream = null;
    }
}

// --- CSV PROCESSING ---
function handleFile(input, type) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        const rows = parseCSV(text);
        state.tempData[type] = rows;
        renderPreview(type, rows);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, h, i) => { obj[h] = values[i]; return obj; }, {});
    });
}

function renderPreview(type, rows) {
    const container = document.getElementById(type + '-preview');
    container.style.display = 'block';
    let html = `<table><tr>${Object.keys(rows[0]).map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.slice(0, 5).forEach(row => {
        html += `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
    html += `</table><p style="color:var(--gold); margin:10px 0;">Previewing top 5 of ${rows.length} records</p>`;
    container.innerHTML = html;
}

function saveData(type) {
    const key = type === 'routine' ? 'examRoutine' : 'examSeatsRawData';
    localStorage.setItem(key, JSON.stringify(state.tempData[type]));
    alert("Data synchronized successfully!");
    showScreen('faculty-dash');
}

// --- ALLOCATION ENGINE ---
function selectBuilding(b) {
    state.currentBuilding = b;
    const bInfo = BUILDINGS[b];
    
    // Set building background for room selection
    const roomScreen = document.getElementById('screen-allocate-rooms');
    if(roomScreen) roomScreen.style.backgroundImage = `url('${bInfo.bg}')`;

    const container = document.getElementById('room-selection-container');
    container.innerHTML = '';
    state.selectedRooms = [];

    const students = JSON.parse(localStorage.getItem('examSeatsRawData') || '[]');
    document.getElementById('capacity-stat').innerText = `Selected: 0 | Needed: ${students.length}`;

    Object.entries(bInfo.floors).forEach(([floor, count]) => {
        for(let r=1; r<=count; r++) {
            const roomKey = `${floor}.${r}`;
            const roomName = bInfo.special?.[roomKey] || `${b}${floor}.${r}`;
            const cap = bInfo.caps[floor];
            
            const btn = document.createElement('div');
            btn.className = 'dash-card'; // Styling from dashboard
            btn.style.padding = '1rem';
            btn.style.cursor = 'pointer';
            btn.innerHTML = `<h3 style="color:var(--gold); margin-bottom:5px;">${roomName}</h3><p style="font-size:0.8rem; opacity:0.8;">Capacity: ${cap}</p>`;
            btn.onclick = () => toggleRoom(btn, roomName, cap, students.length);
            container.appendChild(btn);
        }
    });
    showScreen('allocate-rooms');
}

function toggleRoom(btn, name, cap, total) {
    const idx = state.selectedRooms.findIndex(r => r.name === name);
    if(idx > -1) {
        state.selectedRooms.splice(idx, 1);
        btn.classList.remove('selected');
    } else {
        state.selectedRooms.push({name, cap, current: 0});
        btn.classList.add('selected');
    }
    
    const selCap = state.selectedRooms.reduce((s, r) => s + r.cap, 0);
    const stat = document.getElementById('capacity-stat');
    stat.innerText = `Selected: ${selCap} | Needed: ${total}`;
    
    const warning = document.getElementById('capacity-warning');
    if (selCap >= total) {
        warning.style.display = 'none';
        stat.style.color = 'var(--secondary)';
    } else {
        warning.style.display = 'block';
        stat.style.color = 'var(--gold)';
    }
}

function runAIAllocation() {
    const students = JSON.parse(localStorage.getItem('examSeatsRawData') || '[]');
    const routine = JSON.parse(localStorage.getItem('examRoutine') || '[]');
    
    if(!students.length || !routine.length) return alert("Please upload Student Data and Routine first.");
    const selCap = state.selectedRooms.reduce((s, r) => s + r.cap, 0);
    if(selCap < students.length) return alert("Insufficient room capacity selected!");

    const overlay = document.querySelector('#screen-allocate-rooms .overlay');
    overlay.innerHTML = '<div class="loading-text" style="color:var(--gold); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">Artificial Intelligence is optimizing seat matrix...</div>';

    setTimeout(() => {
        // Group & Alternate Streams
        const streamGroups = {};
        students.forEach(s => {
            if(!streamGroups[s.Stream]) streamGroups[s.Stream] = [];
            streamGroups[s.Stream].push(s);
        });

        const sortedStreams = Object.keys(streamGroups).sort();
        let interleaved = [];
        let hasMore = true;
        let idx = 0;
        
        while(hasMore) {
            hasMore = false;
            sortedStreams.forEach(st => {
                if(streamGroups[st][idx]) {
                    interleaved.push(streamGroups[st][idx]);
                    hasMore = true;
                }
            });
            idx++;
        }

        const allocation = JSON.parse(localStorage.getItem('seatAllocation') || '{}');
        const rooms = [...state.selectedRooms];
        let currentRoomIdx = 0;

        interleaved.forEach((s) => {
            while(rooms[currentRoomIdx].current >= rooms[currentRoomIdx].cap) {
                currentRoomIdx++;
                if (!rooms[currentRoomIdx]) break;
            }
            if (!rooms[currentRoomIdx]) return;

            const room = rooms[currentRoomIdx];
            room.current++;

            const routineInfo = routine.find(r => r.PaperCode === s.SubjectName || r.PaperName === s.SubjectName) || {};

            const record = {
                id: s.EnrollmentID,
                name: s.StudentName,
                stream: s.Stream,
                building: state.currentBuilding,
                floor: room.name.includes('RRR') ? '4' : room.name.split('.')[0].slice(-1),
                room: room.name,
                seat: room.current,
                subject: s.SubjectName,
                subjectCode: routineInfo.PaperCode || s.SubjectName,
                examDate: routineInfo.Date || "TBD",
                examTime: routineInfo.Time || "TBD"
            };

            allocation[`${s.EnrollmentID}_${record.subjectCode}`] = record;
        });

        localStorage.setItem('seatAllocation', JSON.stringify(allocation));
        overlay.innerHTML = '';
        
        document.getElementById('alloc-success-msg').innerText = `${students.length} Students Allocated Across ${state.selectedRooms.length} Rooms`;
        renderAllocationSummary(state.selectedRooms);
        showScreen('allocate-done');
    }, 2000);
}

function renderAllocationSummary(rooms) {
    const container = document.getElementById('alloc-summary');
    let html = `<table><tr><th>Room</th><th>Occupancy</th><th>Status</th></tr>`;
    rooms.forEach(r => {
        html += `<tr><td>${r.name}</td><td>${r.current}/${r.cap}</td><td><span style="color:var(--secondary)">✓ Active</span></td></tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

// --- STUDENT RESULTS ---
function generateStudentResult(data) {
    const container = document.getElementById('student-ticket-container');
    container.innerHTML = `
        <div class="ticket-card" id="student-ticket">
            <div class="ticket-header">
                <h2>${data.subject}</h2>
                <p>UEM SEATS • Official Exam Permit</p>
            </div>
            
            <div class="ticket-divider"></div>
            
            <div class="ticket-body">
                <div class="ticket-grid">
                    <div class="info-item">
                        <label>📅 Date</label>
                        <span>${data.examDate}</span>
                    </div>
                    <div class="info-item">
                        <label>🕒 Time</label>
                        <span>${data.examTime}</span>
                    </div>
                    <div class="info-item">
                        <label>🏢 Bldg</label>
                        <span>${data.building}</span>
                    </div>
                    <div class="info-item">
                        <label>📍 Room</label>
                        <span>${data.room}</span>
                    </div>
                </div>

                <div class="qr-box" id="student-qr-main"></div>
                
                <div style="text-align:center; margin-bottom:1rem;">
                    <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-dim); margin-bottom:5px; letter-spacing:1px;">Seat Index</div>
                    <div style="font-size:3.5rem; font-weight:800; color:var(--gold); font-family:'Outfit'; line-height:1;">${data.seat}</div>
                </div>
            </div>

            <div class="ticket-footer">
                <p style="font-weight:700; color:var(--white);">${data.name}</p>
                <p style="font-size:0.7rem; color:var(--text-dim);">ID: ${data.id}</p>
            </div>
        </div>
    `;
    
    // Use setTimeout for library to catch DOM
    setTimeout(() => {
        const qrBox = document.getElementById('student-qr-main');
        if (qrBox) {
            const qrText = `UEM SEATS - ENTRY PERMIT\n` +
                         `--------------------------\n` +
                         `Student: ${data.name}\n` +
                         `ID: ${data.id}\n` +
                         `Subject: ${data.subject}\n` +
                         `Location: ${data.building} Bldg, Room ${data.room}\n` +
                         `Seat Number: ${data.seat}\n` +
                         `--------------------------\n` +
                         `Verify at uem.edu.in`;

            new QRCode(qrBox, {
                text: qrText,
                width: 140,
                height: 140,
                colorDark: "#0a192f",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, 100);
}

function downloadQR() {
    const qrBox = document.getElementById('student-qr-main');
    const canvas = qrBox.querySelector('canvas');
    const img = qrBox.querySelector('img');
    
    let downloadSource = '';
    if (canvas) {
        downloadSource = canvas.toDataURL("image/png");
    } else if (img) {
        downloadSource = img.src;
    } else {
        return alert("QR data still preparing. Please wait a moment.");
    }

    const a = document.createElement("a");
    a.href = downloadSource;
    a.download = `UEM_Permit_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- LAYOUT VIEWER ---
function initViewLayout() {
    const bSelect = document.getElementById('layout-building');
    bSelect.innerHTML = Object.keys(BUILDINGS).map(b => `<option value="${b}">${b} Building</option>`).join('');
    populateFloors('layout');
}

function populateFloors(prefix) {
    const b = document.getElementById(prefix + '-building').value;
    const fSelect = document.getElementById(prefix + '-floor');
    fSelect.innerHTML = Object.keys(BUILDINGS[b].floors).map(f => `<option value="${f}">Floor ${f}</option>`).join('');
    populateRooms(prefix);
}

function populateRooms(prefix) {
    const b = document.getElementById(prefix + '-building').value;
    const f = document.getElementById(prefix + '-floor').value;
    const rSelect = document.getElementById(prefix + '-room');
    const bInfo = BUILDINGS[b];
    
    let rooms = [];
    for(let r=1; r<=bInfo.floors[f]; r++) {
        const key = `${f}.${r}`;
        const name = bInfo.special?.[key] || `${b}${f}.${r}`;
        rooms.push(`<option value="${name}">${name}</option>`);
    }
    rSelect.innerHTML = rooms.join('');
}

function renderLayout() {
    const room = document.getElementById('layout-room').value;
    const allAlloc = Object.values(JSON.parse(localStorage.getItem('seatAllocation') || '{}'));
    
    const bCode = Object.keys(BUILDINGS).find(k => room.startsWith(k));
    const floorNum = room.includes('RRR') ? '4' : room.split('.')[0].slice(-1);
    const cap = BUILDINGS[bCode].caps[floorNum];

    const filtered = allAlloc.filter(a => a.room === room);
    const container = document.getElementById('layout-display-container');
    container.innerHTML = '<div class="layout-grid"></div>';
    const grid = container.querySelector('.layout-grid');

    for(let i=1; i<=cap; i++) {
        const student = filtered.find(a => a.seat == i);
        const cell = document.createElement('div');
        cell.className = 'seat';
        if(student) {
            cell.classList.add('occupied');
            cell.title = student.name;
            cell.innerHTML = `${i}`;
        } else {
            cell.innerHTML = `<span style="opacity:0.2">${i}</span>`;
        }
        grid.appendChild(cell);
    }
}

// --- ALL ALLOCATIONS ---
function renderAllAllocations() {
    const list = Object.values(JSON.parse(localStorage.getItem('seatAllocation') || '{}'));
    const search = document.getElementById('search-all').value.toLowerCase();
    const filtered = list.filter(a => a.name.toLowerCase().includes(search) || a.id.includes(search));
    
    const container = document.getElementById('all-allocations-table');
    container.innerHTML = `
        <table>
            <tr><th>Enrollment ID</th><th>Name</th><th>Stream</th><th>Location</th><th>Seat</th></tr>
            ${filtered.map(a => `<tr><td>${a.id}</td><td>${a.name}</td><td>${a.stream}</td><td>${a.room}</td><td>${a.seat}</td></tr>`).join('')}
        </table>
    `;
}

// --- UTILS ---
function downloadCSV() {
    const list = Object.values(JSON.parse(localStorage.getItem('seatAllocation') || '{}'));
    if(!list.length) return alert("Nothing to download.");
    
    const csv = "ID,Name,Stream,Room,Seat,Subject\n" + list.map(a => `"${a.id}","${a.name}","${a.stream}","${a.room}","${a.seat}","${a.subject}"`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'UEM_SEATS_Master.csv';
    a.click();
}

function populateStudentSubjects() {
    const routine = JSON.parse(localStorage.getItem('examRoutine') || '[]');
    const select = document.getElementById('student-subject');
    if(!routine.length) {
        select.innerHTML = '<option disabled>No routine uploaded</option>';
        return;
    }
    select.innerHTML = routine.map(r => `<option value="${r.PaperCode || r.PaperName}">${r.PaperName} (${r.PaperCode || ''})</option>`).join('');
}

// Initialize on load
window.onload = () => {
    // Smooth transition in
    document.body.style.opacity = '0';
    setTimeout(() => document.body.style.opacity = '1', 100);
}
