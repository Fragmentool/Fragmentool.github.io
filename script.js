// ─── Estado global ───────────────────────────────────────────
let player;
let currentVideoId = '';
let currentVideoTitle = ''; // Título del video actual
let videoDuration = 0;
let savedPlaylists = [];
let isPlayerReady = false;
let lastModifiedPlaylistId = null;

// Estado de reproducción de playlist
let isPlayingAll = false;
let currentPlayingIndex = -1;
let currentPlayingPlaylistId = null;
let currentPlayingClipId = null; // ID único del clip que se está reproduciendo
let playInterval = null;
let autoPlayNext = true; // Por defecto activado
let userPaused = false; // Flag para distinguir pausa manual de fin natural
let navToken = 0;           // Token de navegación: invalida callbacks asíncronos de clips anteriores

// Estado de edición (fragmento guardado activo)
let currentEditingPlaylistId = null;
let currentEditingClipIndex = null;
let autoSaveTimeout = null;

// Estado de previa de fragmento (modo fragmentar)
let fragmentPreviewInterval = null;

// Estado de previa del final del fragmento
let endPreviewInterval = null;
let isEndPreviewing = false;    // true mientras se previsualiza el final (bloquea playInterval)
let isDraggingTriangle = false;  // true mientras el usuario arrastra cualquier triángulo

// Playhead continuo (modo creación)
let playheadInterval = null;          // Playhead unificado (activo en todos los modos)

// Fragmento pendiente (esperando ser guardado)
let pendingClip = null;

// Progreso actual del clip en reproducción (para restaurar tras re-render)
let currentClipProgress = 0;

// ─── Modo día/noche ──────────────────────────────────────────
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Actualizar icono
    const icon = document.querySelector('.theme-icon');
    icon.innerHTML = newTheme === 'dark' ? getIcon('sun') : getIcon('moon');
}

// Cargar tema guardado al inicio
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.innerHTML = savedTheme === 'dark' ? getIcon('sun') : getIcon('moon');
    }
}

// ─── Sistema de notificaciones unificado ─────────────────────
function showNotification(message, type = 'success', duration = 2000) {
    const indicator = document.getElementById('notificationIndicator');
    const text = document.getElementById('notificationText');
    
    // Limpiar clases anteriores
    indicator.className = 'notification-indicator';
    
    // Agregar clase según tipo
    if (type === 'success') {
        indicator.classList.add('success');
    } else if (type === 'editing') {
        indicator.classList.add('editing');
    }
    
    text.textContent = message;
    
    // Auto-ocultar después de la duración (volver a estado por defecto)
    if (duration > 0) {
        setTimeout(() => {
            resetNotification();
        }, duration);
    }
}

function resetNotification() {
    const indicator = document.getElementById('notificationIndicator');
    const text = document.getElementById('notificationText');
    
    indicator.className = 'notification-indicator hidden';
    text.textContent = 'Listo para crear fragmentos';
}

function hideNotification() {
    resetNotification();
}

// ─── Utilidades ──────────────────────────────────────────────
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── URL input ───────────────────────────────────────────────
function clearUrlInput() {
    document.getElementById('videoUrl').value = '';
}

// ─── Cargar video ────────────────────────────────────────────
function onYouTubeIframeAPIReady() {}

function loadVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    if (!url) { 
        showNotification('Por favor, ingresa una URL de YouTube', 'error', 3000); 
        return; 
    }

    const videoId = extractVideoId(url);
    if (!videoId) { 
        showNotification('URL de YouTube inválida', 'error', 3000); 
        return; 
    }

    currentVideoId = videoId;
    currentVideoTitle = ''; // Resetear título
    stopEverything();

    // Restablecer triángulos a valores por defecto
    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    if (startTriangle) {
        startTriangle.dataset.value = 0;
        startTriangle.style.left = '0%';
    }
    if (endTriangle) {
        endTriangle.dataset.value = 100;
        endTriangle.style.left = '100%';
    }
    updateRangeSelection();

    if (!player) {
        player = new YT.Player('player', {
            height: '100%', width: '100%', videoId,
            playerVars: { playsinline: 1, controls: 1, rel: 0, autoplay: 0 },
            events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
        });
    } else {
        player.cueVideoById(videoId);
    }
}

function onPlayerReady() {
    isPlayerReady = true;
    videoDuration = player.getDuration();
    
    // Obtener el título del video usando la API de YouTube
    try {
        const iframe = player.getIframe();
        const videoData = player.getVideoData();
        currentVideoTitle = videoData.title || 'Video de YouTube';
    } catch (e) {
        currentVideoTitle = 'Video de YouTube';
    }
    
    document.getElementById('videoSection').classList.add('active');
    
    // Inicializar triángulos (ya están en porcentajes, solo actualizar display)
    updateTimeDisplays();
    updateRangeSelection();
    
    updateTimeDisplays();
    updateControlsVisibility();
    showNotification('✅ Video cargado correctamente', 'success');

    // Iniciar playhead unificado (visible en todos los modos)
    startPlayheadTracking();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        videoDuration = player.getDuration();
        updateRangeMax();
        
        // Actualizar título si no lo tenemos
        if (!currentVideoTitle || currentVideoTitle === 'Video de YouTube') {
            try {
                const videoData = player.getVideoData();
                currentVideoTitle = videoData.title || 'Video de YouTube';
            } catch (e) {
                currentVideoTitle = 'Video de YouTube';
            }
        }
    }
    if (event.data === YT.PlayerState.BUFFERING || event.data === YT.PlayerState.CUED) {
        setTimeout(() => { 
            videoDuration = player.getDuration(); 
            updateRangeMax(); 
        }, 500);
    }
    updatePlayPauseIcon();
}

function updateRangeMax() {
    // Los triángulos trabajan con porcentajes, solo necesitamos asegurar que endTriangle esté en 100% si corresponde
    const endTriangle = document.getElementById('endTriangle');
    if (endTriangle && parseFloat(endTriangle.dataset.value) > 100) {
        endTriangle.dataset.value = 100;
        endTriangle.style.left = '100%';
        updateTimeDisplays();
    }
}

// ─── Displays de tiempo y rango ──────────────────────────────
function updateTimeDisplays() {
    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    
    if (!startTriangle || !endTriangle) return;
    
    const startPercent = parseFloat(startTriangle.dataset.value);
    const endPercent = parseFloat(endTriangle.dataset.value);
    
    const start = (startPercent / 100) * videoDuration;
    const end = (endPercent / 100) * videoDuration;
    
    document.getElementById('startTimeDisplay').textContent = formatTime(start);
    document.getElementById('endTimeDisplay').textContent = formatTime(end);
    document.getElementById('durationDisplay').textContent = formatTime(end - start);
}

function updateUIForClip(clip) {
    if (videoDuration <= 0) return;
    
    const startPercent = (clip.startTime / videoDuration) * 100;
    const endPercent = (clip.endTime / videoDuration) * 100;
    
    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    
    if (startTriangle && endTriangle) {
        startTriangle.dataset.value = startPercent;
        startTriangle.style.left = startPercent + '%';
        
        endTriangle.dataset.value = endPercent;
        endTriangle.style.left = endPercent + '%';
    }
    
    // Sincronizar inputs hidden
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    if (startRange) startRange.value = startPercent;
    if (endRange) endRange.value = endPercent;
    
    document.getElementById('startTimeDisplay').textContent = formatTime(clip.startTime);
    document.getElementById('endTimeDisplay').textContent = formatTime(clip.endTime);
    document.getElementById('durationDisplay').textContent = formatTime(clip.duration);
    
    updateRangeSelection();
}

// ─── Listeners de los sliders (Triángulos) ──────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadTheme(); // Cargar tema al inicio
    initTriangleSliders(); // Inicializar triángulos
});

// ═══════════════════════════════════════════════════════════════
// 🔺 SISTEMA DE TRIÁNGULOS ARRASTRABLES
// ═══════════════════════════════════════════════════════════════

let activeTriangle = null;
let containerRect = null;
let startMoveTimeout = null;
let endMoveTimeout = null;

// Función para sincronizar los valores de los triángulos con los inputs hidden
function syncTriangleToInput(triangleId, inputId) {
    const triangle = document.getElementById(triangleId);
    const input = document.getElementById(inputId);
    if (triangle && input) {
        input.value = triangle.dataset.value;
    }
}

// Función para sincronizar los inputs hidden con los triángulos
function syncInputToTriangle(inputId, triangleId) {
    const input = document.getElementById(inputId);
    const triangle = document.getElementById(triangleId);
    if (input && triangle) {
        triangle.dataset.value = input.value;
        triangle.style.left = input.value + '%';
    }
}

// Función para actualizar la barra de selección
function updateRangeSelection() {
    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    const selection = document.getElementById('rangeSelection');
    
    if (!startTriangle || !endTriangle || !selection) return;
    
    const startPos = parseFloat(startTriangle.dataset.value);
    const endPos = parseFloat(endTriangle.dataset.value);
    
    const left = Math.min(startPos, endPos);
    const right = Math.max(startPos, endPos);
    
    selection.style.left = left + '%';
    selection.style.width = (right - left) + '%';
    
    // Sincronizar con inputs hidden para compatibilidad
    syncTriangleToInput('startTriangle', 'startRange');
    syncTriangleToInput('endTriangle', 'endRange');
    
    // Actualizar displays de tiempo
    updateTimeDisplays();
}

// Función para manejar el inicio del arrastre (mouse)
function onTriangleMouseDown(e, triangle) {
    e.preventDefault();
    e.stopPropagation();
    activeTriangle = triangle;
    containerRect = triangle.parentElement.getBoundingClientRect();
    isDraggingTriangle = true;
    
    document.addEventListener('mousemove', onTriangleMouseMove);
    document.addEventListener('mouseup', onTriangleMouseUp);
}

// Función para manejar el movimiento (mouse)
function onTriangleMouseMove(e) {
    if (!activeTriangle || !containerRect) return;
    
    const x = e.clientX - containerRect.left;
    const percent = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
    
    const isStart = activeTriangle.id === 'startTriangle';
    const otherTriangle = isStart ? document.getElementById('endTriangle') : document.getElementById('startTriangle');
    const otherValue = parseFloat(otherTriangle.dataset.value);
    
    // Margen mínimo = 1 segundo de duración del fragmento
    const minGap = videoDuration > 0 ? (1 / videoDuration) * 100 : 0;
    let finalValue = percent;
    if (isStart && percent >= otherValue - minGap) {
        finalValue = otherValue - minGap;
    } else if (!isStart && percent <= otherValue + minGap) {
        finalValue = otherValue + minGap;
    }
    
    activeTriangle.dataset.value = finalValue;
    activeTriangle.style.left = finalValue + '%';
    
    updateRangeSelection();
    scheduleAutoSave();
    
    // Lógica de previsualización
    if (player && isPlayerReady) {
        if (isStart) {
            // Cancelar end preview si estaba activo
            stopEndPreview();
            if (startMoveTimeout) clearTimeout(startMoveTimeout);
            startMoveTimeout = setTimeout(() => {
                const startTime = (finalValue / 100) * videoDuration;
                player.seekTo(startTime, true);
                if (!isPlayingAll) {
                    player.playVideo();
                    startFragmentPreviewMonitor();
                }
            }, 300);
        } else {
            // Preview del final — funciona en todos los modos
            if (fragmentPreviewInterval) { clearInterval(fragmentPreviewInterval); fragmentPreviewInterval = null; }
            if (endMoveTimeout) clearTimeout(endMoveTimeout);
            endMoveTimeout = setTimeout(() => {
                triggerEndPreview(finalValue);
            }, 300);
        }
    }
}

// Función para manejar el fin del arrastre (mouse)
function onTriangleMouseUp() {
    activeTriangle = null;
    containerRect = null;
    flushClipChanges();     // Guardar inmediatamente antes de reanudar playInterval
    isDraggingTriangle = false;
    document.removeEventListener('mousemove', onTriangleMouseMove);
    document.removeEventListener('mouseup', onTriangleMouseUp);
}

// Función para manejar el inicio del arrastre (touch)
function onTriangleTouchStart(e, triangle) {
    e.preventDefault();
    e.stopPropagation();
    activeTriangle = triangle;
    containerRect = triangle.parentElement.getBoundingClientRect();
    isDraggingTriangle = true;
    
    document.addEventListener('touchmove', onTriangleTouchMove, { passive: false });
    document.addEventListener('touchend', onTriangleTouchEnd);
}

// Función para manejar el movimiento (touch)
function onTriangleTouchMove(e) {
    if (!activeTriangle || !containerRect) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const x = touch.clientX - containerRect.left;
    const percent = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
    
    const isStart = activeTriangle.id === 'startTriangle';
    const otherTriangle = isStart ? document.getElementById('endTriangle') : document.getElementById('startTriangle');
    const otherValue = parseFloat(otherTriangle.dataset.value);
    
    // Margen mínimo = 1 segundo de duración del fragmento
    const minGap = videoDuration > 0 ? (1 / videoDuration) * 100 : 0;
    let finalValue = percent;
    if (isStart && percent >= otherValue - minGap) {
        finalValue = otherValue - minGap;
    } else if (!isStart && percent <= otherValue + minGap) {
        finalValue = otherValue + minGap;
    }
    
    activeTriangle.dataset.value = finalValue;
    activeTriangle.style.left = finalValue + '%';
    
    updateRangeSelection();
    scheduleAutoSave();
    
    // Lógica de previsualización
    if (player && isPlayerReady) {
        if (isStart) {
            // Cancelar end preview si estaba activo
            stopEndPreview();
            if (startMoveTimeout) clearTimeout(startMoveTimeout);
            startMoveTimeout = setTimeout(() => {
                const startTime = (finalValue / 100) * videoDuration;
                player.seekTo(startTime, true);
                if (!isPlayingAll) {
                    player.playVideo();
                    startFragmentPreviewMonitor();
                }
            }, 300);
        } else {
            // Preview del final — funciona en todos los modos
            if (fragmentPreviewInterval) { clearInterval(fragmentPreviewInterval); fragmentPreviewInterval = null; }
            if (endMoveTimeout) clearTimeout(endMoveTimeout);
            endMoveTimeout = setTimeout(() => {
                triggerEndPreview(finalValue);
            }, 300);
        }
    }
}

// Función para manejar el fin del arrastre (touch)
function onTriangleTouchEnd() {
    activeTriangle = null;
    containerRect = null;
    flushClipChanges();     // Guardar inmediatamente antes de reanudar playInterval
    isDraggingTriangle = false;
    document.removeEventListener('touchmove', onTriangleTouchMove);
    document.removeEventListener('touchend', onTriangleTouchEnd);
}

// Inicializar los triángulos
function initTriangleSliders() {
    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    
    if (!startTriangle || !endTriangle) return;
    
    // Eventos de mouse
    startTriangle.addEventListener('mousedown', (e) => onTriangleMouseDown(e, startTriangle));
    endTriangle.addEventListener('mousedown', (e) => onTriangleMouseDown(e, endTriangle));
    
    // Eventos de touch
    startTriangle.addEventListener('touchstart', (e) => onTriangleTouchStart(e, startTriangle));
    endTriangle.addEventListener('touchstart', (e) => onTriangleTouchStart(e, endTriangle));
    
    // Posicionar inicialmente
    startTriangle.style.left = startTriangle.dataset.value + '%';
    endTriangle.style.left = endTriangle.dataset.value + '%';
    
    updateRangeSelection();
}


// Monitor de previsualización de fragmento (modo fragmentar)
function startFragmentPreviewMonitor() {
    if (fragmentPreviewInterval) clearInterval(fragmentPreviewInterval);
    
    const endTriangle = document.getElementById('endTriangle');
    const endPercent = parseFloat(endTriangle.dataset.value);
    const endTime = (endPercent / 100) * videoDuration;
    
    fragmentPreviewInterval = setInterval(() => {
        if (!player || !isPlayerReady) {
            clearInterval(fragmentPreviewInterval);
            fragmentPreviewInterval = null;
            return;
        }
        
        if (isPlayingAll) {
            clearInterval(fragmentPreviewInterval);
            fragmentPreviewInterval = null;
            return;
        }
        
        const currentTime = player.getCurrentTime();
        if (currentTime >= endTime) {
            clearInterval(fragmentPreviewInterval);
            fragmentPreviewInterval = null;
            player.pauseVideo();
        }
    }, 100);
}

// ═══════════════════════════════════════════════════════════════
// 🎬 PLAYHEAD CONTINUO Y PREVISUALIZACIÓN DEL FINAL
// ═══════════════════════════════════════════════════════════════

// Calcula cuántos segundos se previsualizan antes del fin del fragmento
function getEndPreviewDuration(fragmentDuration) {
    if (fragmentDuration >= 10) return 5;
    return fragmentDuration / 2; // Dinámico: la mitad para fragmentos cortos
}

// Crea (o devuelve) el elemento playhead visual
function getOrCreatePlayhead() {
    let ph = document.getElementById('previewPlayhead');
    if (!ph) {
        ph = document.createElement('div');
        ph.id = 'previewPlayhead';
        ph.className = 'preview-playhead';
        const container = document.querySelector('.range-container');
        if (container) container.appendChild(ph);
    }
    return ph;
}

function hidePlayhead() {
    const ph = document.getElementById('previewPlayhead');
    if (ph) ph.classList.remove('active');
}

function showPlayhead() {
    const ph = getOrCreatePlayhead();
    ph.classList.add('active');
}

function setPlayheadPercent(percent) {
    const ph = document.getElementById('previewPlayhead');
    if (ph) ph.style.left = percent + '%';
}

// ── Playhead unificado (todos los modos) ───────────────────────
// Siempre activo mientras haya video cargado; muestra posición en tiempo real.
function startPlayheadTracking() {
    if (playheadInterval) clearInterval(playheadInterval);
    const ph = getOrCreatePlayhead();
    ph.classList.add('active');
    playheadInterval = setInterval(() => {
        if (!player || !isPlayerReady || videoDuration <= 0) return;
        const pct = (player.getCurrentTime() / videoDuration) * 100;

        // Clamp al rango delimitado por los marcadores de inicio/fin
        const startT = document.getElementById('startTriangle');
        const endT   = document.getElementById('endTriangle');
        const lo = startT ? parseFloat(startT.dataset.value) : 0;
        const hi = endT   ? parseFloat(endT.dataset.value)   : 100;
        ph.style.left = Math.min(Math.max(pct, lo), hi) + '%';
    }, 50);
}

function stopPlayheadTracking() {
    if (playheadInterval) { clearInterval(playheadInterval); playheadInterval = null; }
    hidePlayhead();
}

// ── Dispara la previsualización del final ──────────────────────
function triggerEndPreview(endTriangleValue) {
    const startTriangle = document.getElementById('startTriangle');
    const startPercent  = parseFloat(startTriangle.dataset.value);
    const startTime     = (startPercent / 100) * videoDuration;
    const endTime       = (endTriangleValue / 100) * videoDuration;
    const fragDuration  = endTime - startTime;
    if (fragDuration <= 0) return;

    const previewDuration = getEndPreviewDuration(fragDuration);
    const previewStart    = Math.max(startTime, endTime - previewDuration);

    // Suspender playInterval durante la previsualización para evitar conflictos
    isEndPreviewing = true;

    player.seekTo(previewStart, true);
    player.playVideo();

    startEndPreviewMonitor(endTime);
}

// ── Monitor de previsualización del final ─────────────────────
// Solo detecta cuando el video alcanza endTime; la posición la
// muestra el playhead unificado que ya está corriendo.
function startEndPreviewMonitor(endTime) {
    if (endPreviewInterval) clearInterval(endPreviewInterval);

    // Esperar a que el player arranque
    let waitCount = 0;
    const waitForPlay = setInterval(() => {
        waitCount++;
        if (waitCount > 40) clearInterval(waitForPlay);
        if (!player || !isPlayerReady) return;
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            clearInterval(waitForPlay);
            runEndPreviewLoop(endTime);
        }
    }, 100);
}

function runEndPreviewLoop(endTime) {
    if (endPreviewInterval) clearInterval(endPreviewInterval);

    endPreviewInterval = setInterval(() => {
        if (!player || !isPlayerReady) {
            clearInterval(endPreviewInterval); endPreviewInterval = null; return;
        }
        // isPlayingAll puede estar activo (edición de clip en playlist) — no salir

        const currentTime = player.getCurrentTime();

        if (currentTime >= endTime) {
            clearInterval(endPreviewInterval);
            endPreviewInterval = null;
            isEndPreviewing = false; // Liberar bloqueo de playInterval

            if (currentEditingPlaylistId !== null) {
                // MODO PLAYLIST: respetar autoPlayNext
                if (autoPlayNext) {
                    currentPlayingIndex++;
                    setTimeout(() => {
                        playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
                    }, 300);
                } else {
                    player.pauseVideo();
                    userPaused = true;
                }
            } else {
                // MODO CREACIÓN: pausar; el playhead queda estático en endTime
                player.pauseVideo();
            }
        }
    }, 50);
}

function stopEndPreview() {
    if (endPreviewInterval) { clearInterval(endPreviewInterval); endPreviewInterval = null; }
    isEndPreviewing = false;
}

// Aplicar cambios del triángulo inmediatamente al soltar (sin esperar debounce)
function flushClipChanges() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) return;

    // Cancelar el debounce pendiente para no guardar dos veces
    if (autoSaveTimeout) { clearTimeout(autoSaveTimeout); autoSaveTimeout = null; }

    const pl = savedPlaylists.find(p => p.id === currentEditingPlaylistId);
    if (!pl || currentEditingClipIndex >= pl.clips.length) return;

    const clip = pl.clips[currentEditingClipIndex];

    const startTriangle = document.getElementById('startTriangle');
    const endTriangle   = document.getElementById('endTriangle');
    if (!startTriangle || !endTriangle) return;

    const s = (parseFloat(startTriangle.dataset.value) / 100) * videoDuration;
    const e = (parseFloat(endTriangle.dataset.value)   / 100) * videoDuration;
    if ((e - s) < 1) return; // no guardar si duración inválida

    clip.startTime = s;
    clip.endTime   = e;
    clip.duration  = e - s;

    const baseName = clip.name.replace(/\s*\[\d+:\d+-\d+:\d+\]$/, '').trim();
    clip.name = `${baseName} [${formatTime(s)}-${formatTime(e)}]`;

    saveToLocalStorage();
    renderPlaylists();
}

// ─── Auto-guardado ───────────────────────────────────────────
function scheduleAutoSave() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) return;
    
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    autoSaveTimeout = setTimeout(() => {
        const pl = savedPlaylists.find(p => p.id === currentEditingPlaylistId);
        if (!pl || currentEditingClipIndex >= pl.clips.length) return;
        
        const clip = pl.clips[currentEditingClipIndex];
        
        const startTriangle = document.getElementById('startTriangle');
        const endTriangle = document.getElementById('endTriangle');
        const startPercent = parseFloat(startTriangle.dataset.value);
        const endPercent = parseFloat(endTriangle.dataset.value);
        
        const s = (startPercent / 100) * videoDuration;
        const e = (endPercent / 100) * videoDuration;
        
        if ((e - s) < 1) {
            showNotification('Duración mínima: 1 segundo', 'error', 2000);
            return;
        }

        clip.startTime = s;
        clip.endTime   = e;
        clip.duration  = e - s;
        
        // Actualizar la marca de tiempo en el nombre del fragmento
        const baseName = clip.name.replace(/\s*\[\d+:\d+-\d+:\d+\]$/, '').trim();
        clip.name = `${baseName} [${formatTime(s)}-${formatTime(e)}]`;
        
        saveToLocalStorage();
        renderPlaylists();
        showNotification('💾 Cambios guardados automáticamente', 'editing', 1500);
    }, 1000);
}

// ─── Controles de transporte ─────────────────────────────────
function updatePlayPauseIcon() {
    const btn = document.getElementById('playPauseBtn');
    if (!player || !isPlayerReady) return;
    
    const state = player.getPlayerState();
    updatePlayPauseButton(state === YT.PlayerState.PLAYING);
}

function togglePlayPause() {
    if (!player || !isPlayerReady) return;
    
    const state = player.getPlayerState();
    
    // CRÍTICO: Si estamos en modo playlist, NO permitir pausa manual
    // Solo permitir pausa cuando NO estamos reproduciendo una playlist
    if (isPlayingAll) {
        // Si está reproduciendo, pausar
        if (state === YT.PlayerState.PLAYING) {
            userPaused = true;
            player.pauseVideo();
            // Limpiar el intervalo para evitar que el monitor reactive el video
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
            }
        } else {
            // Reanudar: limpiar flag y volver al inicio del fragmento si terminó
            userPaused = false;
            if (currentPlayingPlaylistId !== null) {
                const pl = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
                if (pl && pl.clips[currentPlayingIndex]) {
                    const clip = pl.clips[currentPlayingIndex];
                    if (state === YT.PlayerState.ENDED || player.getCurrentTime() < clip.startTime || player.getCurrentTime() >= clip.endTime) {
                        player.seekTo(clip.startTime, true);
                    }
                    player.playVideo();
                    startPlayInterval(clip);
                } else {
                    player.playVideo();
                }
            } else {
                player.playVideo();
            }
        }
        // NO llamar updateTransportButtons aquí para no cambiar controles
        updatePlayPauseIcon();
        return;
    }
    
    // Modo normal (no playlist)
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        if (fragmentPreviewInterval) {
            clearInterval(fragmentPreviewInterval);
            fragmentPreviewInterval = null;
        }
    } else {
        const startTriangle = document.getElementById('startTriangle');
        const startPercent = parseFloat(startTriangle.dataset.value);
        const s = (startPercent / 100) * videoDuration;
        player.seekTo(s, true);
        player.playVideo();
        startFragmentPreviewMonitor();
    }
    
    updatePlayPauseIcon();
}

function playPrevious() {
    if (!isPlayingAll || currentPlayingPlaylistId === null) return;
    
    const playlist = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
    if (!playlist) return;
    
    currentPlayingIndex--;
    if (currentPlayingIndex < 0) currentPlayingIndex = playlist.clips.length - 1;
    
    playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
}

function playNext() {
    if (!isPlayingAll || currentPlayingPlaylistId === null) return;
    
    const playlist = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
    if (!playlist) return;
    
    currentPlayingIndex++;
    if (currentPlayingIndex >= playlist.clips.length) currentPlayingIndex = 0;
    
    playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
}

function toggleAutoPlay() {
    autoPlayNext = !autoPlayNext;
    updateAutoPlayButton();
    if (autoPlayNext) {
        showNotification('🔄 Reproducción automática activada', 'success', 1500);
    } else {
        showNotification('⏸️ Reproducción automática desactivada', 'success', 1500);
    }
}

function updateAutoPlayButton() {
    const btn = document.getElementById('autoPlayBtn');
    if (!btn) return;
    
    if (autoPlayNext) {
        btn.innerHTML = getIcon('autoplayOn', 'icon-lg');
        btn.title = 'Reproducción automática activada - Click para desactivar';
        btn.classList.add('active');
    } else {
        btn.innerHTML = getIcon('autoplayOff', 'icon-lg');
        btn.title = 'Reproducción automática desactivada - Click para activar';
        btn.classList.remove('active');
    }
}

function updateControlsVisibility() {
    const guardarBtn = document.querySelector('.btn-guardar');
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    
    if (isPlayingAll) {
        // Modo playlist: ocultar guardar, mostrar autoplay
        if (guardarBtn) guardarBtn.style.display = 'none';
        if (autoPlayBtn) {
            autoPlayBtn.style.display = 'flex';
            updateAutoPlayButton();
        }
    } else {
        // Modo normal: mostrar guardar, ocultar autoplay
        if (guardarBtn) guardarBtn.style.display = 'block';
        if (autoPlayBtn) autoPlayBtn.style.display = 'none';
    }
}

function updateTransportButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (isPlayingAll && currentPlayingPlaylistId !== null) {
        prevBtn.classList.add('active');
        nextBtn.classList.add('active');
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    } else {
        prevBtn.classList.remove('active');
        nextBtn.classList.remove('active');
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
    
    updateControlsVisibility();
}

// ─── Guardar fragmento ───────────────────────────────────────
function openSaveClipModal() {
    if (!player || !isPlayerReady || !currentVideoId) {
        showNotification('Primero carga un video', 'error', 3000);
        return;
    }

    const startTriangle = document.getElementById('startTriangle');
    const endTriangle = document.getElementById('endTriangle');
    const startPercent = parseFloat(startTriangle.dataset.value);
    const endPercent = parseFloat(endTriangle.dataset.value);
    
    const s = (startPercent / 100) * videoDuration;
    const e = (endPercent / 100) * videoDuration;

    if (e <= s) {
        showNotification('El tiempo de fin debe ser mayor al de inicio', 'error', 3000);
        return;
    }

    if ((e - s) < 1) {
        showNotification('La duración mínima del fragmento es 1 segundo', 'error', 3000);
        return;
    }

    // Crear nombre significativo: título del video + marca de tiempo
    const clipName = `${currentVideoTitle} [${formatTime(s)}-${formatTime(e)}]`;

    pendingClip = {
        videoId: currentVideoId,
        startTime: s,
        endTime: e,
        duration: e - s,
        name: clipName
    };

    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">Selecciona una playlist</option>';
    savedPlaylists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.textContent = pl.name;
        select.appendChild(opt);
    });

    // Preseleccionar la playlist más reciente modificada
    if (lastModifiedPlaylistId) {
        select.value = lastModifiedPlaylistId;
    }

    document.getElementById('saveClipModal').classList.add('show');
}

function closeSaveClipModal() {
    document.getElementById('saveClipModal').classList.remove('show');
    pendingClip = null;
}

function showCreateFromSaveModal() {
    // No cerrar el modal de guardar, solo abrir el modal de crear por encima
    showCreatePlaylistModal();
}

function saveClipToPlaylist() {
    if (!pendingClip) return;

    const id = parseInt(document.getElementById('playlistSelect').value);
    if (!id) {
        showNotification('Selecciona una playlist', 'error', 3000);
        return;
    }

    const playlist = savedPlaylists.find(p => p.id === id);
    if (!playlist) return;

    // Agregar ID único al clip
    pendingClip.clipId = Date.now() + Math.random(); // ID único para el clip
    
    playlist.clips.push(pendingClip);
    lastModifiedPlaylistId = id;
    saveToLocalStorage();
    renderPlaylists();
    closeSaveClipModal();
    showNotification(`✅ Fragmento guardado en "${playlist.name}"`, 'success');
    pendingClip = null;
}

// ─── Modal crear playlist ────────────────────────────────────
function showCreatePlaylistModal() {
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('createPlaylistModal').classList.add('show');
    // Enfocar el input después de que el modal se muestre
    setTimeout(() => {
        document.getElementById('newPlaylistName').focus();
    }, 100);
}

function closeCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').classList.remove('show');
    document.getElementById('newPlaylistName').value = '';
}

function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    if (!name) { 
        showNotification('Ingresa un nombre para la playlist', 'error', 3000); 
        return; 
    }

    const hasPending = pendingClip !== null;
    
    // Si hay un clip pendiente, agregar ID único
    if (hasPending && !pendingClip.clipId) {
        pendingClip.clipId = Date.now() + Math.random();
    }
    
    const newPl = {
        id: Date.now(), 
        name,
        clips: hasPending ? [{ ...pendingClip }] : [],
        createdAt: new Date().toISOString(),
        expanded: false
    };

    savedPlaylists.push(newPl);
    if (hasPending) {
        lastModifiedPlaylistId = newPl.id;
    }
    saveToLocalStorage();
    renderPlaylists();
    closeCreatePlaylistModal();

    if (hasPending) {
        // Cerrar también el modal de guardar
        closeSaveClipModal();
        showNotification(`✅ Playlist "${name}" creada con el fragmento`, 'success');
        pendingClip = null;
    } else {
        showNotification(`✅ Playlist "${name}" creada`, 'success');
    }
}

// ─── Reproducción de playlists ───────────────────────────────
function playPlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist || playlist.clips.length === 0) { 
        showNotification('La playlist está vacía', 'error', 3000); 
        return; 
    }
    
    // Asegurarse de que hay un video cargado o cargar el primero
    if (!player || !isPlayerReady) { 
        // Si no hay player, cargar el primer video de la playlist
        const firstClip = playlist.clips[0];
        if (!firstClip) return;
        
        // Cargar el video
        const urlInput = document.getElementById('videoUrl');
        urlInput.value = `https://www.youtube.com/watch?v=${firstClip.videoId}`;
        loadVideo();
        
        // Esperar a que el video se cargue
        setTimeout(() => {
            if (isPlayerReady) {
                isPlayingAll = true;
                currentPlayingIndex = 0;
                currentPlayingPlaylistId = playlistId;
                renderPlaylists();
                updateTransportButtons();
                playClipFromPlaylist(playlistId, 0);
            }
        }, 2000);
        return;
    }
    
    stopEverything();
    isPlayingAll = true;
    currentPlayingIndex = 0;
    currentPlayingPlaylistId = playlistId;
    renderPlaylists();
    updateTransportButtons();
    playClipFromPlaylist(playlistId, 0);
}

function playClipFromPlaylist(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) { stopEverything(); return; }

    if (clipIndex >= playlist.clips.length) clipIndex = 0;
    if (clipIndex < 0) clipIndex = playlist.clips.length - 1;
    
    const clip = playlist.clips[clipIndex];

    // Incrementar token: invalida todos los callbacks async del clip anterior
    const myToken = ++navToken;

    // Cancelar cualquier preview del final activo al navegar
    stopEndPreview();
    isDraggingTriangle = false;
    
    // Resetear el progreso del fragmento anterior antes de cambiar
    if (currentPlayingClipId !== null && currentPlayingClipId !== clip.clipId) {
        const oldClipElements = document.querySelectorAll(`[data-clip-id="${currentPlayingClipId}"]`);
        oldClipElements.forEach(el => el.style.setProperty('--clip-progress', '0%'));
    }
    
    currentPlayingIndex = clipIndex;
    currentPlayingClipId = clip.clipId;
    currentClipProgress = 0;
    userPaused = false;

    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex  = clipIndex;
    showNotification('✏️ Editando fragmento guardado — cambios automáticos', 'editing', 0);

    updateUIForClip(clip);

    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }

    const needsVideoSwitch = (clip.videoId !== currentVideoId);

    if (needsVideoSwitch) {
        currentVideoId = clip.videoId;
        currentVideoTitle = '';
        
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        
        const checkPlaying = setInterval(() => {
            if (navToken !== myToken) { clearInterval(checkPlaying); return; } // navegación más reciente
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
                clearInterval(checkPlaying);
                try {
                    const videoData = player.getVideoData();
                    currentVideoTitle = videoData.title || 'Video de YouTube';
                } catch (e) {
                    currentVideoTitle = 'Video de YouTube';
                }
                setTimeout(() => {
                    if (navToken !== myToken) return;
                    videoDuration = player.getDuration();
                    updateUIForClip(clip);
                }, 500);
                startPlayInterval(clip);
            }
        }, 100);
        
        setTimeout(() => {
            if (navToken !== myToken) return; // navegación más reciente
            if (!userPaused && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.seekTo(clip.startTime, true);
                player.playVideo();
                startPlayInterval(clip);
            }
        }, 3000);
        
    } else {
        player.seekTo(clip.startTime, true);
        player.playVideo();
        
        setTimeout(() => {
            if (navToken !== myToken) return; // navegación más reciente
            videoDuration = player.getDuration();
            updateUIForClip(clip);
        }, 300);
        
        startPlayInterval(clip);
    }
}

function startPlayInterval(clip) {
    if (playInterval) clearInterval(playInterval);
    startPlayheadTracking(); // Asegurar que el playhead esté activo
    
    playInterval = setInterval(() => {
        // CRÍTICO: Verificar que seguimos en modo playlist
        if (!isPlayingAll) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(0);
            return;
        }

        const state = player.getPlayerState();

        // Actualizar barra de progreso siempre (incluso durante preview/drag)
        if (state === YT.PlayerState.PLAYING && videoDuration > 0) {
            const ct = player.getCurrentTime();
            // Usar valores ACTUALES del clip (pueden haber cambiado por edición)
            const pl = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
            const liveClip = pl ? pl.clips[currentPlayingIndex] : clip;
            if (liveClip && liveClip.duration > 0) {
                const progress = ((ct - liveClip.startTime) / liveClip.duration) * 100;
                updateClipProgress(Math.min(Math.max(progress, 0), 100));
            }
        }

        // Durante preview del final o arrastre de triángulo, no avanzar
        if (isEndPreviewing || isDraggingTriangle) return;

        // Si el video terminó naturalmente
        if (state === YT.PlayerState.ENDED) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(100);
            if (autoPlayNext) {
                currentPlayingIndex++;
                setTimeout(() => { if (isPlayingAll) playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex); }, 500);
            } else {
                userPaused = true;
                showNotification('⏸️ Reproducción pausada - Activa la reproducción automática o usa ⮞', 'success', 2500);
            }
            return;
        }

        if (state !== YT.PlayerState.PLAYING) return;

        const currentTime = player.getCurrentTime();

        // Usar valores ACTUALES (editados) del clip
        const activePl   = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
        const activeClip = activePl ? activePl.clips[currentPlayingIndex] : clip;
        if (!activeClip) return;

        // Si el tiempo actual está ANTES del inicio (seekTo aún no completó), esperar
        if (currentTime < activeClip.startTime - 0.5) return;

        if (currentTime >= activeClip.endTime) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(100);
            if (autoPlayNext) {
                currentPlayingIndex++;
                setTimeout(() => { if (isPlayingAll) playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex); }, 500);
            } else {
                userPaused = true;
                player.pauseVideo();
                showNotification('⏸️ Reproducción pausada - Activa la reproducción automática o usa ⮞', 'success', 2500);
            }
        }
    }, 100);
}

// Función para actualizar el progreso visual del fragmento
function updateClipProgress(percentage) {
    if (currentPlayingClipId === null) return;
    
    currentClipProgress = percentage; // Guardar para restaurar tras re-render
    
    // Buscar el elemento del clip actual por su ID único
    const clipElements = document.querySelectorAll(
        `[data-clip-id="${currentPlayingClipId}"]`
    );
    
    clipElements.forEach(clipElement => {
        clipElement.style.setProperty('--clip-progress', `${percentage}%`);
    });
}

function playClipDirect(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const clip = playlist.clips[clipIndex];
    if (!clip) return;

    // Si no hay player aún, cargar el video del clip y esperar
    if (!player || !isPlayerReady) {
        const urlInput = document.getElementById('videoUrl');
        urlInput.value = `https://www.youtube.com/watch?v=${clip.videoId}`;
        loadVideo();

        const waitAndPlay = setInterval(() => {
            if (isPlayerReady) {
                clearInterval(waitAndPlay);
                playClipDirect(playlistId, clipIndex);
            }
        }, 200);

        setTimeout(() => clearInterval(waitAndPlay), 8000);
        return;
    }

    stopEverything();
    isPlayingAll = true;
    currentPlayingIndex = clipIndex;
    currentPlayingPlaylistId = playlistId;
    currentPlayingClipId = clip.clipId;
    currentClipProgress = 0;
    userPaused = false;

    const myToken = ++navToken; // Token para esta navegación

    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex  = clipIndex;
    showNotification('✏️ Editando fragmento guardado — cambios automáticos', 'editing', 0);
    updateTransportButtons();

    updateUIForClip(clip);

    const needsVideoSwitch = (clip.videoId !== currentVideoId);

    if (needsVideoSwitch) {
        currentVideoId = clip.videoId;
        currentVideoTitle = '';
        
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        
        const checkPlaying = setInterval(() => {
            if (navToken !== myToken) { clearInterval(checkPlaying); return; }
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
                clearInterval(checkPlaying);
                try {
                    const videoData = player.getVideoData();
                    currentVideoTitle = videoData.title || 'Video de YouTube';
                } catch (e) {
                    currentVideoTitle = 'Video de YouTube';
                }
                setTimeout(() => {
                    if (navToken !== myToken) return;
                    videoDuration = player.getDuration();
                    updateUIForClip(clip);
                }, 500);
                startSingleClipInterval(clip);
            }
        }, 100);
        
        setTimeout(() => {
            if (navToken !== myToken) return;
            if (!userPaused && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.seekTo(clip.startTime, true);
                player.playVideo();
                startSingleClipInterval(clip);
            }
        }, 3000);
        
    } else {
        player.seekTo(clip.startTime, true);
        player.playVideo();
        
        setTimeout(() => {
            if (navToken !== myToken) return;
            videoDuration = player.getDuration();
            updateUIForClip(clip);
        }, 300);
        
        startSingleClipInterval(clip);
    }
}

function startSingleClipInterval(clip) {
    if (playInterval) clearInterval(playInterval);
    startPlayheadTracking(); // Asegurar que el playhead esté activo
    
    playInterval = setInterval(() => {
        if (!isPlayingAll) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(0);
            return;
        }

        const state = player.getPlayerState();

        // Actualizar barra de progreso siempre (incluso durante preview/drag)
        if (state === YT.PlayerState.PLAYING && videoDuration > 0) {
            const ct = player.getCurrentTime();
            const pl = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
            const liveClip = pl ? pl.clips[currentPlayingIndex] : clip;
            if (liveClip && liveClip.duration > 0) {
                const progress = ((ct - liveClip.startTime) / liveClip.duration) * 100;
                updateClipProgress(Math.min(Math.max(progress, 0), 100));
            }
        }

        // Durante preview del final o arrastre de triángulo, no avanzar
        if (isEndPreviewing || isDraggingTriangle) return;

        if (state === YT.PlayerState.ENDED) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(100);
            if (autoPlayNext) {
                currentPlayingIndex++;
                setTimeout(() => { if (isPlayingAll) playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex); }, 500);
            } else {
                userPaused = true;
                player.pauseVideo();
                showNotification('⏸️ Reproducción pausada - Activa la reproducción automática o usa ⮞', 'success', 2500);
            }
            return;
        }

        if (state !== YT.PlayerState.PLAYING) return;

        const currentTime = player.getCurrentTime();

        const activePl   = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
        const activeClip = activePl ? activePl.clips[currentPlayingIndex] : clip;
        if (!activeClip) return;

        // Si seekTo aún no completó, esperar
        if (currentTime < activeClip.startTime - 0.5) return;

        if (currentTime >= activeClip.endTime) {
            clearInterval(playInterval);
            playInterval = null;
            updateClipProgress(100);
            if (autoPlayNext) {
                currentPlayingIndex++;
                setTimeout(() => { if (isPlayingAll) playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex); }, 500);
            } else {
                userPaused = true;
                player.pauseVideo();
                showNotification('⏸️ Reproducción pausada - Activa la reproducción automática o usa ⮞', 'success', 2500);
            }
        }
    }, 100);
}

// ─── Detener todo ────────────────────────────────────────────
function stopEverything() {
    isPlayingAll = false;
    currentPlayingIndex = -1;
    currentPlayingPlaylistId = null;
    currentPlayingClipId = null; // Resetear el ID del clip actual
    currentEditingPlaylistId = null;
    currentEditingClipIndex  = null;
    currentClipProgress = 0; // Resetear progreso guardado
    userPaused = false; // Limpiar pausa manual

    if (playInterval) { 
        clearInterval(playInterval); 
        playInterval = null; 
    }
    if (fragmentPreviewInterval) { 
        clearInterval(fragmentPreviewInterval); 
        fragmentPreviewInterval = null; 
    }
    stopEndPreview();
    stopPlayheadTracking();
    if (player && isPlayerReady) player.pauseVideo();

    // Resetear todos los progresos visuales
    resetAllClipsProgress();
    
    hideNotification();
    updateTransportButtons();
    renderPlaylists();
}

// Función para resetear el progreso de todos los fragmentos
function resetAllClipsProgress() {
    const allClips = document.querySelectorAll('.clip-item-mini');
    allClips.forEach(clip => {
        clip.style.setProperty('--clip-progress', '0%');
    });
}

// ─── Compartir playlists ─────────────────────────────────────
function sharePlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Validar que la playlist tenga fragmentos
    if (playlist.clips.length === 0) {
        showNotification('No puedes compartir una playlist vacía', 'error', 3000);
        return;
    }

    // Crear objeto con datos de la playlist - asegurar todos los campos
    const shareData = {
        name: playlist.name,
        clips: playlist.clips.map(clip => ({
            videoId: clip.videoId || '',
            startTime: clip.startTime || 0,
            endTime: clip.endTime || 0,
            name: clip.name || 'Fragmento'
        }))
    };

    // Validar que todos los clips tengan videoId
    const invalidClips = shareData.clips.filter(c => !c.videoId);
    if (invalidClips.length > 0) {
        showNotification('Algunos fragmentos no tienen video asociado', 'error', 3000);
        return;
    }

    try {
        // Comprimir datos a base64
        const jsonString = JSON.stringify(shareData);
        const base64Data = btoa(encodeURIComponent(jsonString));
        
        // Crear URL con los datos
        const shareUrl = `${window.location.origin}${window.location.pathname}?playlist=${base64Data}`;
        
        // Mostrar en modal
        document.getElementById('shareUrlInput').value = shareUrl;
        document.getElementById('sharePlaylistModal').classList.add('show');
    } catch (error) {
        console.error('Error al crear enlace:', error);
        showNotification('Error al generar el enlace de compartir', 'error', 3000);
    }
}

function closeSharePlaylistModal() {
    document.getElementById('sharePlaylistModal').classList.remove('show');
}

function copyShareUrl() {
    const input = document.getElementById('shareUrlInput');
    input.select();
    input.setSelectionRange(0, 99999); // Para móviles
    
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.querySelector('.btn-copy-url');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copiado';
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
        }, 2000);
        
        showNotification('🔗 Enlace copiado al portapapeles', 'success');
    }).catch(err => {
        // Fallback para navegadores que no soportan clipboard API
        try {
            document.execCommand('copy');
            showNotification('🔗 Enlace copiado al portapapeles', 'success');
        } catch (e) {
            showNotification('Error al copiar. Selecciona y copia manualmente.', 'error', 3000);
        }
    });
}

// ─── Importar playlist desde URL ─────────────────────────────
function checkForSharedPlaylist() {
    const urlParams = new URLSearchParams(window.location.search);
    const playlistData = urlParams.get('playlist');
    
    if (playlistData) {
        try {
            // Decodificar base64
            const jsonString = decodeURIComponent(atob(playlistData));
            const shareData = JSON.parse(jsonString);
            
            // Verificar que los datos sean válidos
            if (!shareData.name || !Array.isArray(shareData.clips)) {
                throw new Error('Datos de playlist inválidos');
            }
            
            // Mostrar confirmación para importar
            const clipCount = shareData.clips.length;
            const message = `¿Quieres importar la playlist "${shareData.name}" con ${clipCount} fragmento${clipCount !== 1 ? 's' : ''}?`;
            
            if (confirm(message)) {
                const newPlaylistId = importSharedPlaylist(shareData);
                
                // Reproducir automáticamente después de importar
                setTimeout(() => {
                    if (newPlaylistId) {
                        playPlaylist(newPlaylistId);
                    }
                }, 1000);
            }
            
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } catch (error) {
            console.error('Error al importar playlist:', error);
            showNotification('Error al importar la playlist compartida', 'error', 3000);
            // Limpiar URL incluso si hay error
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

function importSharedPlaylist(shareData) {
    // Verificar que cada clip tenga todos los campos necesarios
    const validClips = shareData.clips.map((clip, index) => {
        if (!clip.videoId || clip.startTime === undefined || clip.endTime === undefined) {
            throw new Error('Datos de fragmento incompletos');
        }
        
        return {
            videoId: clip.videoId,
            startTime: parseFloat(clip.startTime),
            endTime: parseFloat(clip.endTime),
            duration: parseFloat(clip.endTime) - parseFloat(clip.startTime),
            name: clip.name || `Fragmento ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`,
            clipId: Date.now() + Math.random() + index // ID único para cada clip
        };
    });
    
    const newPlaylist = {
        id: Date.now(),
        name: shareData.name,
        clips: validClips,
        createdAt: new Date().toISOString(),
        expanded: false
    };
    
    savedPlaylists.push(newPlaylist);
    saveToLocalStorage();
    renderPlaylists();
    
    showNotification(`✅ Playlist "${shareData.name}" importada con ${validClips.length} fragmentos`, 'success', 3000);
    
    // DEVUELVE EL ID DE LA NUEVA PLAYLIST
    return newPlaylist.id;
}

function editPlaylistName(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const n = prompt('Nombre de la playlist:', pl.name);
    if (n !== null && n.trim()) { 
        pl.name = n.trim(); 
        saveToLocalStorage(); 
        renderPlaylists(); 
        showNotification('✅ Nombre actualizado', 'success');
    }
}

function editClipName(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const clip = pl.clips[clipIndex];
    if (!clip) return;
    const n = prompt('Nombre del fragmento:', clip.name);
    if (n !== null && n.trim()) { 
        clip.name = n.trim(); 
        saveToLocalStorage(); 
        renderPlaylists(); 
        showNotification('✅ Nombre actualizado', 'success');
    }
}

// ─── Eliminar ────────────────────────────────────────────────
function deletePlaylist(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl || !confirm(`¿Eliminar "${pl.name}"?`)) return;
    if (currentPlayingPlaylistId === playlistId) stopEverything();
    savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);
    saveToLocalStorage(); 
    renderPlaylists();
    showNotification('✅ Playlist eliminada', 'success');
}

function deleteClip(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl || !confirm('¿Eliminar este fragmento?')) return;
    pl.clips.splice(clipIndex, 1);
    saveToLocalStorage(); 
    renderPlaylists();
    showNotification('✅ Fragmento eliminado', 'success');
}

// ─── Renderizar playlists ────────────────────────────────────
function renderPlaylists() {
    const containerDesktop = document.getElementById('playlistsContainerDesktop');
    const containerMobile = document.getElementById('playlistsContainerMobile');
    
    const content = generatePlaylistsHTML();
    
    if (containerDesktop) containerDesktop.innerHTML = content;
    if (containerMobile) containerMobile.innerHTML = content;
}

function generatePlaylistsHTML() {
    if (savedPlaylists.length === 0) {
        return `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
                </svg>
                <p>No tienes playlists.<br>¡Crea tu primera playlist!</p>
            </div>`;
    }

    return savedPlaylists.map(pl => `
        <div class="playlist-item ${currentPlayingPlaylistId === pl.id ? 'playing' : ''}" data-playlist-id="${pl.id}">
            <div class="playlist-header-row" onclick="togglePlaylist(${pl.id})">
                <span class="playlist-name-label"
                    ondblclick="event.stopPropagation(); editPlaylistName(${pl.id})"
                    title="Doble clic para editar">${pl.name}</span>
                <div class="playlist-actions">
                    <button class="btn-play-playlist" onclick="event.stopPropagation(); playPlaylist(${pl.id})" title="Reproducir">
                        ${getIcon('play', 'icon-md')}
                    </button>
                    <button class="btn-share-playlist" onclick="event.stopPropagation(); sharePlaylist(${pl.id})" title="Compartir">
                        ${getIcon('link', 'icon-md')}
                    </button>
                    <button class="btn-delete-playlist" onclick="event.stopPropagation(); deletePlaylist(${pl.id})" title="Eliminar">
                        ${getIcon('delete', 'icon-md')}
                    </button>
                </div>
            </div>
            <div class="playlist-clips ${pl.expanded ? 'expanded' : ''}" id="clips-${pl.id}">
                ${pl.clips.length === 0
                    ? '<p style="padding:10px;text-align:center;color:#999;">No hay fragmentos</p>'
                    : pl.clips.map((clip, i) => {
                        // Asegurar que el clip tenga un ID único
                        if (!clip.clipId) {
                            clip.clipId = Date.now() + Math.random() + i;
                        }
                        return `
                        <div class="clip-item-mini"
                            draggable="true"
                            data-playlist-id="${pl.id}"
                            data-clip-index="${i}"
                            data-clip-id="${clip.clipId}"
                            ondragstart="handleDragStart(event)"
                            ondragover="handleDragOver(event)"
                            ondragenter="handleDragEnter(event)"
                            ondragleave="handleDragLeave(event)"
                            ondrop="handleDrop(event)"
                            ondragend="handleDragEnd(event)">
                            <span class="drag-handle" title="Arrastrar para reordenar">
                                ${getIcon('dragHandle', 'icon-sm')}
                            </span>
                            <span class="clip-name"
                                ondblclick="editClipName(${pl.id}, ${i})"
                                title="${clip.name || 'FRAGMENTO'}">${clip.name || 'FRAGMENTO'}</span>
                            <div class="clip-actions-mini">
                                <button class="btn-favorite-clip ${clip.favorite ? 'favorited' : ''}" 
                                    onclick="toggleFavorite(${pl.id}, ${i})" 
                                    title="${clip.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">
                                    ${clip.favorite ? getIcon('starFilled') : getIcon('star')}
                                </button>
                                <button class="btn-play-clip" onclick="playClipDirect(${pl.id}, ${i})" title="Reproducir">
                                    ${getIcon('play')}
                                </button>
                                <button class="btn-clone-clip" onclick="cloneClip(${pl.id}, ${i})" title="Clonar">
                                    ${getIcon('clone')}
                                </button>
                                <button class="btn-delete-clip" onclick="deleteClip(${pl.id}, ${i})" title="Eliminar">
                                    ${getIcon('delete')}
                                </button>
                            </div>
                        </div>`;
                    }).join('')}
            </div>
        </div>
    `).join('');
}

function togglePlaylist(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (pl) { 
        pl.expanded = !pl.expanded; 
        renderPlaylists(); 
    }
}

// ─── Drag & Drop ─────────────────────────────────────────────
let draggedElement = null, draggedPlaylistId = null, draggedClipIndex = null;

function handleDragStart(e) {
    draggedElement    = e.currentTarget;
    draggedPlaylistId = parseInt(e.currentTarget.dataset.playlistId);
    draggedClipIndex  = parseInt(e.currentTarget.dataset.clipIndex);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e) { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
    return false; 
}

function handleDragEnter(e) {
    const t = e.currentTarget;
    if (parseInt(t.dataset.playlistId) === draggedPlaylistId && t !== draggedElement) {
        t.classList.add('drag-over');
    }
}

function handleDragLeave(e) { 
    e.currentTarget.classList.remove('drag-over'); 
}

function handleDrop(e) {
    e.stopPropagation();
    const t = e.currentTarget;
    const targetPl = parseInt(t.dataset.playlistId);
    const targetIdx = parseInt(t.dataset.clipIndex);
    if (targetPl !== draggedPlaylistId || draggedElement === t) return false;

    const pl = savedPlaylists.find(p => p.id === draggedPlaylistId);
    if (!pl) return false;
    const [moved] = pl.clips.splice(draggedClipIndex, 1);
    pl.clips.splice(targetIdx, 0, moved);

    // Actualizar currentPlayingIndex al nuevo orden visual
    if (currentPlayingPlaylistId === draggedPlaylistId && currentPlayingClipId !== null) {
        const newIndex = pl.clips.findIndex(c => c.clipId === currentPlayingClipId);
        if (newIndex !== -1) {
            currentPlayingIndex = newIndex;
            currentEditingClipIndex = newIndex;
        }
    }

    saveToLocalStorage();
    renderPlaylists();

    // Restaurar la barra de progreso del fragmento en reproducción tras re-render
    if (currentPlayingClipId !== null) {
        updateClipProgress(currentClipProgress);
    }

    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.clip-item-mini').forEach(el => el.classList.remove('drag-over'));
    draggedElement = draggedPlaylistId = draggedClipIndex = null;
}

// ─── localStorage ────────────────────────────────────────────
function saveToLocalStorage() {
    try { 
        localStorage.setItem('youtubePlaylists', JSON.stringify(savedPlaylists)); 
    } catch (e) { 
        console.error(e); 
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('youtubePlaylists');
        if (data) { 
            savedPlaylists = JSON.parse(data); 
            renderPlaylists(); 
        }
    } catch (e) { 
        console.error(e); 
    }
}

function cloneClip(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const clip = pl.clips[clipIndex];
    if (!clip) return;
    
    // Crear copia del fragmento con un nuevo ID único
    const clonedClip = {
        ...clip,
        name: `${clip.name} (copia)`,
        clipId: Date.now() + Math.random() // Nuevo ID único para el clon
    };
    
    // Insertar después del fragmento original
    pl.clips.splice(clipIndex + 1, 0, clonedClip);
    
    saveToLocalStorage();
    renderPlaylists();
    showNotification('✅ Fragmento clonado', 'success');
}

// ─── Toggle Favorito ─────────────────────────────────────────
function toggleFavorite(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const clip = pl.clips[clipIndex];
    if (!clip) return;
    
    // Alternar el estado de favorito
    clip.favorite = !clip.favorite;
    
    // Guardar inmediatamente sin re-renderizar
    saveToLocalStorage();
    
    // Encontrar todos los elementos del clip (desktop y mobile)
    const clipElements = document.querySelectorAll(
        `[data-playlist-id="${playlistId}"][data-clip-index="${clipIndex}"]`
    );
    
    // Aplicar animación dorada a todos los elementos del clip
    clipElements.forEach(clipElement => {
        clipElement.classList.add('favorite-animation');
        
        // Actualizar solo el botón de favorito sin re-renderizar todo
        const favoriteBtn = clipElement.querySelector('.btn-favorite-clip');
        if (favoriteBtn) {
            if (clip.favorite) {
                favoriteBtn.classList.add('favorited');
                favoriteBtn.innerHTML = getIcon('starFilled');
                favoriteBtn.title = 'Quitar de favoritos';
            } else {
                favoriteBtn.classList.remove('favorited');
                favoriteBtn.innerHTML = getIcon('star');
                favoriteBtn.title = 'Marcar como favorito';
            }
        }
        
        // Remover la animación después de 1 segundo
        setTimeout(() => {
            clipElement.classList.remove('favorite-animation');
        }, 1000);
    });
    
    // Mostrar notificación
    if (clip.favorite) {
        showNotification('⭐ Marcado como favorito', 'success', 1500);
    } else {
        showNotification('Removido de favoritos', 'success', 1500);
    }
}

// ─── Editar nombres ──────────────────────────────────────────

// ─── Inicializar Iconos SVG ──────────────────────────────────
function initializeIcons() {
    // Botones de transporte
    const prevBtn = document.getElementById('prevBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const nextBtn = document.getElementById('nextBtn');
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    
    if (prevBtn) { prevBtn.innerHTML = getIcon('prev', 'icon-lg'); prevBtn.style.display = 'none'; }
    if (playPauseBtn) playPauseBtn.innerHTML = getIcon('play', 'icon-lg');
    if (nextBtn) { nextBtn.innerHTML = getIcon('next', 'icon-lg'); nextBtn.style.display = 'none'; }
    if (autoPlayBtn) autoPlayBtn.innerHTML = getIcon('autoplayOn', 'icon-lg');
    
    // Botón de agregar playlist
    const addPlaylistBtns = document.querySelectorAll('.btn-add-playlist');
    addPlaylistBtns.forEach(btn => {
        btn.innerHTML = getIcon('add', 'icon-lg');
    });
    
    // Botones de cierre de modales
    const closeButtons = document.querySelectorAll('.modal-close .icon-close');
    closeButtons.forEach(btn => {
        btn.innerHTML = Icons.close;
    });
}

// Actualizar botón play/pause
function updatePlayPauseButton(isPlaying) {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
        btn.innerHTML = isPlaying ? getIcon('pause', 'icon-lg') : getIcon('play', 'icon-lg');
    }
}

// ─── Init ────────────────────────────────────────────────────
loadFromLocalStorage();
renderPlaylists();
checkForSharedPlaylist(); // Verificar si hay una playlist compartida en la URL

// Inicializar iconos cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadTheme();
        initializeIcons();
    });
} else {
    loadTheme();
    initializeIcons();
}