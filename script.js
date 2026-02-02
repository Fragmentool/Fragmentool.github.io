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
let playInterval = null;
let autoPlayNext = true; // Por defecto activado

// Estado de edición (fragmento guardado activo)
let currentEditingPlaylistId = null;
let currentEditingClipIndex = null;
let autoSaveTimeout = null;

// Estado de previa de fragmento (modo fragmentar)
let fragmentPreviewInterval = null;

// Fragmento pendiente (esperando ser guardado)
let pendingClip = null;

// ─── Modo día/noche ──────────────────────────────────────────
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Actualizar icono
    const icon = document.querySelector('.theme-icon');
    icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Cargar tema guardado al inicio
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
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

    // Restablecer sliders a valores por defecto
    document.getElementById('startRange').value = 0;
    document.getElementById('endRange').value = 100;

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
    
    document.getElementById('startRange').value = 0;
    document.getElementById('startRange').max = videoDuration;
    document.getElementById('endRange').value = videoDuration;
    document.getElementById('endRange').max = videoDuration;
    
    updateTimeDisplays();
    updateControlsVisibility();
    showNotification('✅ Video cargado correctamente', 'success');
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
    const s = document.getElementById('startRange');
    const e = document.getElementById('endRange');
    s.max = videoDuration;
    e.max = videoDuration;
    if (e.value == 100 || parseFloat(e.value) > videoDuration) {
        e.value = videoDuration;
        updateTimeDisplays();
    }
}

// ─── Displays de tiempo y rango ──────────────────────────────
function updateTimeDisplays() {
    const start = parseFloat(document.getElementById('startRange').value);
    const end   = parseFloat(document.getElementById('endRange').value);
    document.getElementById('startTimeDisplay').textContent  = formatTime(start);
    document.getElementById('endTimeDisplay').textContent    = formatTime(end);
    document.getElementById('durationDisplay').textContent   = formatTime(end - start);

    if (videoDuration > 0) {
        const sel = document.getElementById('rangeSelection');
        sel.style.left  = (start / videoDuration * 100) + '%';
        sel.style.width = ((end - start) / videoDuration * 100) + '%';
    }
}

function updateUIForClip(clip) {
    const s = document.getElementById('startRange');
    const e = document.getElementById('endRange');
    if (videoDuration > 0) { s.max = videoDuration; e.max = videoDuration; }
    s.value = clip.startTime;
    e.value = clip.endTime;
    document.getElementById('startTimeDisplay').textContent  = formatTime(clip.startTime);
    document.getElementById('endTimeDisplay').textContent    = formatTime(clip.endTime);
    document.getElementById('durationDisplay').textContent   = formatTime(clip.duration);
    if (videoDuration > 0) {
        const sel = document.getElementById('rangeSelection');
        sel.style.left  = (clip.startTime / videoDuration * 100) + '%';
        sel.style.width = ((clip.endTime - clip.startTime) / videoDuration * 100) + '%';
    }
}

// ─── Listeners de los sliders ────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadTheme(); // Cargar tema al inicio
    
    const startRange = document.getElementById('startRange');
    const endRange   = document.getElementById('endRange');
    
    let startMoveTimeout = null;
    let endMoveTimeout = null;

    startRange.addEventListener('input', function () {
        if (parseFloat(this.value) >= parseFloat(endRange.value)) this.value = parseFloat(endRange.value) - 1;
        updateTimeDisplays();
        scheduleAutoSave();
        
        if (player && isPlayerReady && !isPlayingAll) {
            if (startMoveTimeout) clearTimeout(startMoveTimeout);
            
            startMoveTimeout = setTimeout(() => {
                const startTime = parseFloat(this.value);
                player.seekTo(startTime, true);
                
                if (currentEditingPlaylistId === null) {
                    player.playVideo();
                    startFragmentPreviewMonitor();
                }
            }, 300);
        }
    });

    endRange.addEventListener('input', function () {
        if (parseFloat(this.value) <= parseFloat(startRange.value)) this.value = parseFloat(startRange.value) + 1;
        updateTimeDisplays();
        scheduleAutoSave();
        
        if (player && isPlayerReady && !isPlayingAll && player.getPlayerState() === YT.PlayerState.PLAYING) {
            if (endMoveTimeout) clearTimeout(endMoveTimeout);
            
            endMoveTimeout = setTimeout(() => {
                startFragmentPreviewMonitor();
            }, 300);
        }
    });
});

// Monitor de previsualización de fragmento (modo fragmentar)
function startFragmentPreviewMonitor() {
    if (fragmentPreviewInterval) clearInterval(fragmentPreviewInterval);
    
    const endTime = parseFloat(document.getElementById('endRange').value);
    
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

// ─── Auto-guardado ───────────────────────────────────────────
function scheduleAutoSave() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) return;
    
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    autoSaveTimeout = setTimeout(() => {
        const pl = savedPlaylists.find(p => p.id === currentEditingPlaylistId);
        if (!pl || currentEditingClipIndex >= pl.clips.length) return;
        
        const clip = pl.clips[currentEditingClipIndex];
        const s = parseFloat(document.getElementById('startRange').value);
        const e = parseFloat(document.getElementById('endRange').value);
        
        clip.startTime = s;
        clip.endTime   = e;
        clip.duration  = e - s;
        
        saveToLocalStorage();
        showNotification('💾 Cambios guardados automáticamente', 'editing', 1500);
    }, 1000);
}

// ─── Controles de transporte ─────────────────────────────────
function updatePlayPauseIcon() {
    const btn = document.getElementById('playPauseBtn');
    if (!player || !isPlayerReady) return;
    
    const state = player.getPlayerState();
    btn.textContent = (state === YT.PlayerState.PLAYING) ? '❚❚' : '▶';
}

function togglePlayPause() {
    if (!player || !isPlayerReady) return;
    
    const state = player.getPlayerState();
    
    // CRÍTICO: Si estamos en modo playlist, NO permitir pausa manual
    // Solo permitir pausa cuando NO estamos reproduciendo una playlist
    if (isPlayingAll) {
        // Si está reproduciendo, pausar
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            // Si está pausado, reanudar desde donde estaba
            player.playVideo();
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
        const s = parseFloat(document.getElementById('startRange').value);
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
        btn.innerHTML = '🔄';
        btn.title = 'Reproducción automática activada - Click para desactivar';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '⏸️';
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
    } else {
        prevBtn.classList.remove('active');
        nextBtn.classList.remove('active');
    }
    
    updateControlsVisibility();
}

// ─── Guardar fragmento ───────────────────────────────────────
function openSaveClipModal() {
    if (!player || !isPlayerReady || !currentVideoId) {
        showNotification('Primero carga un video', 'error', 3000);
        return;
    }

    const s = parseFloat(document.getElementById('startRange').value);
    const e = parseFloat(document.getElementById('endRange').value);

    if (e <= s) {
        showNotification('El tiempo de fin debe ser mayor al de inicio', 'error', 3000);
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
    if (!player || !isPlayerReady) { 
        showNotification('Primero carga un video', 'error', 3000); 
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
    currentPlayingIndex = clipIndex;

    const clip = playlist.clips[clipIndex];

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
        currentVideoTitle = ''; // Resetear título
        
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        
        const checkPlaying = setInterval(() => {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
                clearInterval(checkPlaying);
                
                // Obtener título del nuevo video
                try {
                    const videoData = player.getVideoData();
                    currentVideoTitle = videoData.title || 'Video de YouTube';
                } catch (e) {
                    currentVideoTitle = 'Video de YouTube';
                }
                
                setTimeout(() => {
                    videoDuration = player.getDuration();
                    updateUIForClip(clip);
                }, 500);
                
                startPlayInterval(clip);
            }
        }, 100);
        
        setTimeout(() => {
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.seekTo(clip.startTime, true);
                player.playVideo();
                startPlayInterval(clip);
            }
        }, 3000);
        
    } else {
        player.seekTo(clip.startTime, true);
        player.playVideo();
        
        setTimeout(() => {
            videoDuration = player.getDuration();
            updateUIForClip(clip);
        }, 300);
        
        startPlayInterval(clip);
    }
}

function startPlayInterval(clip) {
    if (playInterval) clearInterval(playInterval);
    
    playInterval = setInterval(() => {
        // CRÍTICO: Verificar que seguimos en modo playlist
        if (!isPlayingAll) {
            clearInterval(playInterval);
            playInterval = null;
            return;
        }
        
        // CRÍTICO: Solo verificar tiempo si el video está reproduciendo
        const state = player.getPlayerState();
        if (state !== YT.PlayerState.PLAYING) {
            return;
        }
        
        const currentTime = player.getCurrentTime();
        if (currentTime >= clip.endTime) {
            clearInterval(playInterval);
            playInterval = null;
            
            // Solo avanzar automáticamente si autoPlayNext está activado
            if (autoPlayNext) {
                currentPlayingIndex++;
                
                setTimeout(() => {
                    if (isPlayingAll) {
                        playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
                    }
                }, 500);
            } else {
                // Detener la reproducción
                player.pauseVideo();
                showNotification('⏸️ Reproducción pausada - Activa la reproducción automática o usa ⮞', 'success', 2500);
            }
        }
    }, 100);
}

function playClipDirect(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const clip = playlist.clips[clipIndex];
    if (!player || !isPlayerReady) { 
        showNotification('Primero carga un video', 'error', 3000); 
        return; 
    }

    stopEverything();
    isPlayingAll = true;
    currentPlayingIndex = clipIndex;
    currentPlayingPlaylistId = playlistId;

    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex  = clipIndex;
    showNotification('✏️ Editando fragmento guardado — cambios automáticos', 'editing', 0);
    updateTransportButtons();

    updateUIForClip(clip);

    const needsVideoSwitch = (clip.videoId !== currentVideoId);

    if (needsVideoSwitch) {
        currentVideoId = clip.videoId;
        currentVideoTitle = ''; // Resetear título
        
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        
        const checkPlaying = setInterval(() => {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
                clearInterval(checkPlaying);
                
                // Obtener título del nuevo video
                try {
                    const videoData = player.getVideoData();
                    currentVideoTitle = videoData.title || 'Video de YouTube';
                } catch (e) {
                    currentVideoTitle = 'Video de YouTube';
                }
                
                setTimeout(() => {
                    videoDuration = player.getDuration();
                    updateUIForClip(clip);
                }, 500);
                startSingleClipInterval(clip);
            }
        }, 100);
        
        setTimeout(() => {
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.seekTo(clip.startTime, true);
                player.playVideo();
                startSingleClipInterval(clip);
            }
        }, 3000);
        
    } else {
        player.seekTo(clip.startTime, true);
        player.playVideo();
        
        setTimeout(() => {
            videoDuration = player.getDuration();
            updateUIForClip(clip);
        }, 300);
        
        startSingleClipInterval(clip);
    }
}

function startSingleClipInterval(clip) {
    if (playInterval) clearInterval(playInterval);
    
    playInterval = setInterval(() => {
        if (!isPlayingAll) {
            clearInterval(playInterval);
            playInterval = null;
            return;
        }
        
        const state = player.getPlayerState();
        if (state !== YT.PlayerState.PLAYING) {
            return;
        }
        
        const currentTime = player.getCurrentTime();
        if (currentTime >= clip.endTime) {
            clearInterval(playInterval);
            playInterval = null;
            
            // Comportamiento igual que startPlayInterval - respetar autoPlayNext
            if (autoPlayNext) {
                currentPlayingIndex++;
                
                setTimeout(() => {
                    if (isPlayingAll) {
                        playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
                    }
                }, 500);
            } else {
                // Detener la reproducción
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
    currentEditingPlaylistId = null;
    currentEditingClipIndex  = null;

    if (playInterval) { 
        clearInterval(playInterval); 
        playInterval = null; 
    }
    if (fragmentPreviewInterval) { 
        clearInterval(fragmentPreviewInterval); 
        fragmentPreviewInterval = null; 
    }
    if (player && isPlayerReady) player.pauseVideo();

    hideNotification();
    updateTransportButtons();
    renderPlaylists();
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
                importSharedPlaylist(shareData);
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
    const validClips = shareData.clips.map(clip => {
        if (!clip.videoId || clip.startTime === undefined || clip.endTime === undefined) {
            throw new Error('Datos de fragmento incompletos');
        }
        
        return {
            videoId: clip.videoId,
            startTime: parseFloat(clip.startTime),
            endTime: parseFloat(clip.endTime),
            duration: parseFloat(clip.endTime) - parseFloat(clip.startTime),
            name: clip.name || `Fragmento ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`
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
                    <button class="btn-play-playlist" onclick="event.stopPropagation(); playPlaylist(${pl.id})" title="Reproducir">▶</button>
                    <button class="btn-share-playlist" onclick="event.stopPropagation(); sharePlaylist(${pl.id})" title="Compartir">🔗</button>
                    <button class="btn-delete-playlist" onclick="event.stopPropagation(); deletePlaylist(${pl.id})" title="Eliminar">🗑</button>
                </div>
            </div>
            <div class="playlist-clips ${pl.expanded ? 'expanded' : ''}" id="clips-${pl.id}">
                ${pl.clips.length === 0
                    ? '<p style="padding:10px;text-align:center;color:#999;">No hay fragmentos</p>'
                    : pl.clips.map((clip, i) => `
                        <div class="clip-item-mini"
                            draggable="true"
                            data-playlist-id="${pl.id}"
                            data-clip-index="${i}"
                            ondragstart="handleDragStart(event)"
                            ondragover="handleDragOver(event)"
                            ondragenter="handleDragEnter(event)"
                            ondragleave="handleDragLeave(event)"
                            ondrop="handleDrop(event)"
                            ondragend="handleDragEnd(event)">
                            <span class="drag-handle" title="Arrastrar para reordenar">⋮⋮</span>
                            <span class="clip-name"
                                ondblclick="editClipName(${pl.id}, ${i})"
                                title="${clip.name || 'FRAGMENTO'}">${clip.name || 'FRAGMENTO'}</span>
                            <div class="clip-actions-mini">
                                <button class="btn-play-clip" onclick="playClipDirect(${pl.id}, ${i})" title="Reproducir">▶</button>
                                <button class="btn-clone-clip" onclick="cloneClip(${pl.id}, ${i})" title="Clonar">📋</button>
                                <button class="btn-delete-clip" onclick="deleteClip(${pl.id}, ${i})" title="Eliminar">🗑</button>
                            </div>
                        </div>`).join('')}
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
    saveToLocalStorage();
    renderPlaylists();
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
    
    // Crear copia del fragmento
    const clonedClip = {
        ...clip,
        name: `${clip.name} (copia)`
    };
    
    // Insertar después del fragmento original
    pl.clips.splice(clipIndex + 1, 0, clonedClip);
    
    saveToLocalStorage();
    renderPlaylists();
    showNotification('✅ Fragmento clonado', 'success');
}

// ─── Editar nombres ──────────────────────────────────────────

// ─── Init ────────────────────────────────────────────────────
loadFromLocalStorage();
renderPlaylists();
checkForSharedPlaylist(); // Verificar si hay una playlist compartida en la URL
