// ─── Estado global ───────────────────────────────────────────
let player;
let currentVideoId = '';
let videoDuration = 0;
let savedPlaylists = [];
let isPlayerReady = false;

// Estado de reproducción de playlist
let isPlayingAll = false;
let currentPlayingIndex = -1;
let currentPlayingPlaylistId = null;
let playInterval = null;       // intervalo que vigila el fin del clip en playlist

// Estado de edición (fragmento guardado activo)
let currentEditingPlaylistId = null;
let currentEditingClipIndex = null;
let autoSaveTimeout = null;

// Estado de previa de fragmento (modo fragmentar)
let fragmentPreviewInterval = null;

// Fragmento pendiente (esperando ser guardado)
let pendingClip = null;

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

function showAlert(message, type = 'error') {
    const alert = document.getElementById(type === 'error' ? 'errorAlert' : 'successAlert');
    alert.textContent = message;
    alert.classList.add('show');
    setTimeout(() => alert.classList.remove('show'), type === 'error' ? 4000 : 1800);
}

// ─── URL input ───────────────────────────────────────────────
function clearUrlInput() {
    document.getElementById('videoUrl').value = '';
}

// ─── Cargar video ────────────────────────────────────────────
function onYouTubeIframeAPIReady() {}

function loadVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    if (!url) { showAlert('Por favor, ingresa una URL de YouTube'); return; }

    const videoId = extractVideoId(url);
    if (!videoId) { showAlert('URL de YouTube inválida'); return; }

    currentVideoId = videoId;
    stopEverything(); // limpia cualquier estado de reproducción

    if (!player) {
        player = new YT.Player('player', {
            height: '100%', width: '100%', videoId,
            playerVars: { playsinline: 1, controls: 1, rel: 0 },
            events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
        });
    } else {
        player.loadVideoById(videoId);
    }
}

function onPlayerReady() {
    isPlayerReady = true;
    videoDuration = player.getDuration();
    document.getElementById('videoSection').classList.add('active');
    document.getElementById('startRange').max = videoDuration;
    document.getElementById('endRange').max = videoDuration;
    document.getElementById('endRange').value = videoDuration;
    updateTimeDisplays();
    showAlert('Video cargado correctamente', 'success');
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        videoDuration = player.getDuration();
        updateRangeMax();
    }
    if (event.data === YT.PlayerState.BUFFERING || event.data === YT.PlayerState.CUED) {
        setTimeout(() => { videoDuration = player.getDuration(); updateRangeMax(); }, 500);
    }
    // Sincronizar icono del botón play/pause
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
    const startRange = document.getElementById('startRange');
    const endRange   = document.getElementById('endRange');

    startRange.addEventListener('input', function () {
        if (parseFloat(this.value) >= parseFloat(endRange.value)) this.value = parseFloat(endRange.value) - 1;
        updateTimeDisplays();
        scheduleAutoSave();
    });

    endRange.addEventListener('input', function () {
        if (parseFloat(this.value) <= parseFloat(startRange.value)) this.value = parseFloat(startRange.value) + 1;
        updateTimeDisplays();
        scheduleAutoSave();
    });

    loadFromLocalStorage();
});

// ─── Auto-guardado de fragmento editado ─────────────────────
function scheduleAutoSave() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) return;
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSaveClipChanges, 500);
}

function autoSaveClipChanges() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) return;
    const playlist = savedPlaylists.find(p => p.id === currentEditingPlaylistId);
    if (!playlist || !playlist.clips[currentEditingClipIndex]) return;

    const clip  = playlist.clips[currentEditingClipIndex];
    const start = parseFloat(document.getElementById('startRange').value);
    const end   = parseFloat(document.getElementById('endRange').value);
    clip.startTime = start;
    clip.endTime   = end;
    clip.duration  = end - start;
    saveToLocalStorage();
    renderPlaylists();

    // feedback
    const el = document.getElementById('successAlert');
    el.textContent = '✓ Cambios guardados automáticamente';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
}

// ─── Controles de transporte ─────────────────────────────────
function updatePlayPauseIcon() {
    const btn = document.getElementById('playPauseBtn');
    if (!player || !isPlayerReady) { btn.textContent = '▶'; return; }
    btn.textContent = (player.getPlayerState() === YT.PlayerState.PLAYING) ? '⏸' : '▶';
}

function updateTransportButtons() {
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const hasPlaylist = currentPlayingPlaylistId !== null;
    prev.classList.toggle('active', hasPlaylist);
    next.classList.toggle('active', hasPlaylist);

    const info = document.getElementById('activePlaylistInfo');
    if (hasPlaylist) {
        const pl = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
        document.getElementById('activePlaylistName').textContent = pl ? pl.name : '';
        info.style.display = 'block';
    } else {
        info.style.display = 'none';
    }
}

// Play / Pause central
function togglePlayPause() {
    if (!player || !isPlayerReady) return;
    const state = player.getPlayerState();

    if (currentPlayingPlaylistId !== null) {
        // ── Modo playlist ──
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    } else {
        // ── Modo fragmento ──
        if (state === YT.PlayerState.PLAYING) {
            // pausar y cancelar intervalo de preview
            player.pauseVideo();
            if (fragmentPreviewInterval) {
                clearInterval(fragmentPreviewInterval);
                fragmentPreviewInterval = null;
            }
        } else {
            // iniciar/reiniciar preview del fragmento
            startFragmentPreview();
        }
    }
}

function startFragmentPreview() {
    const start = parseFloat(document.getElementById('startRange').value);
    const end   = parseFloat(document.getElementById('endRange').value);
    player.seekTo(start, true);
    player.playVideo();

    if (fragmentPreviewInterval) clearInterval(fragmentPreviewInterval);
    fragmentPreviewInterval = setInterval(() => {
        if (player.getCurrentTime() >= end) {
            player.pauseVideo();
            clearInterval(fragmentPreviewInterval);
            fragmentPreviewInterval = null;
        }
    }, 100);
}

// Anterior
function playPrevious() {
    if (currentPlayingPlaylistId === null) return;
    const playlist = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
    if (!playlist || playlist.clips.length === 0) return;

    currentPlayingIndex--;
    if (currentPlayingIndex < 0) currentPlayingIndex = playlist.clips.length - 1;
    playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
}

// Siguiente
function playNext() {
    if (currentPlayingPlaylistId === null) return;
    const playlist = savedPlaylists.find(p => p.id === currentPlayingPlaylistId);
    if (!playlist || playlist.clips.length === 0) return;

    currentPlayingIndex++;
    if (currentPlayingIndex >= playlist.clips.length) currentPlayingIndex = 0;
    playClipFromPlaylist(currentPlayingPlaylistId, currentPlayingIndex);
}

// ─── Modal guardar fragmento ─────────────────────────────────
function openSaveClipModal() {
    if (!player || !isPlayerReady) { showAlert('Primero carga un video'); return; }
    const start = parseFloat(document.getElementById('startRange').value);
    const end   = parseFloat(document.getElementById('endRange').value);
    if (end - start < 1) { showAlert('El fragmento debe tener al menos 1 segundo'); return; }

    const videoData = player.getVideoData();
    let name = (videoData.title || 'Video sin título').replace(/[<>:"/\\|?*]/g, '');
    if (name.length > 50) name = name.substring(0, 47) + '...';

    pendingClip = { id: Date.now(), videoId: currentVideoId, startTime: start, endTime: end, duration: end - start, name };
    updatePlaylistSelector();
    document.getElementById('saveClipModal').classList.add('show');
}

function closeSaveClipModal() {
    document.getElementById('saveClipModal').classList.remove('show');
    pendingClip = null;
}

function updatePlaylistSelector() {
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">Selecciona una playlist</option>';
    savedPlaylists.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function showCreateFromSaveModal() {
    // No cerrar saveClipModal para mantener pendingClip
    document.getElementById('createPlaylistModal').classList.add('show');
}

function saveClipToPlaylist() {
    const id = parseInt(document.getElementById('playlistSelect').value);
    if (!id) { showAlert('Selecciona una playlist'); return; }
    if (!pendingClip) { showAlert('No hay fragmento para guardar'); return; }
    const playlist = savedPlaylists.find(p => p.id === id);
    if (!playlist) { showAlert('Playlist no encontrada'); return; }

    playlist.clips.push(pendingClip);
    saveToLocalStorage();
    renderPlaylists();
    closeSaveClipModal();
    showAlert(`Fragmento guardado en "${playlist.name}"`, 'success');
    pendingClip = null;
}

// ─── Modal crear playlist ────────────────────────────────────
function showCreatePlaylistModal() {
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('createPlaylistModal').classList.add('show');
}

function closeCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').classList.remove('show');
}

function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    if (!name) { showAlert('Ingresa un nombre para la playlist'); return; }

    const hasPending = pendingClip !== null;
    const newPl = {
        id: Date.now(), name,
        clips: hasPending ? [{ ...pendingClip }] : [],
        createdAt: new Date().toISOString(),
        expanded: false
    };

    savedPlaylists.push(newPl);
    saveToLocalStorage();
    renderPlaylists();
    closeCreatePlaylistModal();

    if (hasPending) {
        document.getElementById('saveClipModal').classList.remove('show');
        showAlert(`Playlist "${name}" creada con el fragmento`, 'success');
        pendingClip = null;
    } else {
        showAlert(`Playlist "${name}" creada`, 'success');
    }
}

// ─── Reproducción de playlists ───────────────────────────────
function playPlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist || playlist.clips.length === 0) { showAlert('La playlist está vacía'); return; }
    if (!player || !isPlayerReady) { showAlert('Primero carga un video'); return; }

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

    // loop
    if (clipIndex >= playlist.clips.length) clipIndex = 0;
    currentPlayingIndex = clipIndex;

    const clip = playlist.clips[clipIndex];

    // activar modo edición
    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex  = clipIndex;
    document.getElementById('editingModeIndicator').style.display = 'block';

    updateUIForClip(clip);

    if (clip.videoId !== currentVideoId) {
        player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.startTime });
        currentVideoId = clip.videoId;
    } else {
        player.seekTo(clip.startTime, true);
    }

    setTimeout(() => {
        player.playVideo();
        setTimeout(() => { videoDuration = player.getDuration(); updateUIForClip(clip); }, 1000);

        if (playInterval) clearInterval(playInterval);
        playInterval = setInterval(() => {
            if (!isPlayingAll) { clearInterval(playInterval); playInterval = null; return; }
            if (player.getCurrentTime() >= clip.endTime) {
                clearInterval(playInterval); playInterval = null;
                currentPlayingIndex++;
                setTimeout(() => { if (isPlayingAll) playClipFromPlaylist(playlistId, currentPlayingIndex); }, 500);
            }
        }, 100);
    }, 500);
}

// Reproducir clip individual (desde botón ▶ del fragmento)
function playClipDirect(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const clip = playlist.clips[clipIndex];
    if (!player || !isPlayerReady) { showAlert('Primero carga un video'); return; }

    // Iniciar como playlist de un solo elemento desde ese punto
    stopEverything();
    isPlayingAll = true;
    currentPlayingIndex = clipIndex;
    currentPlayingPlaylistId = playlistId;

    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex  = clipIndex;
    document.getElementById('editingModeIndicator').style.display = 'block';
    updateTransportButtons();

    updateUIForClip(clip);

    if (clip.videoId !== currentVideoId) {
        player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.startTime });
        currentVideoId = clip.videoId;
    } else {
        player.seekTo(clip.startTime, true);
    }

    setTimeout(() => {
        player.playVideo();
        setTimeout(() => { videoDuration = player.getDuration(); updateUIForClip(clip); }, 1000);

        if (playInterval) clearInterval(playInterval);
        playInterval = setInterval(() => {
            if (!isPlayingAll) { clearInterval(playInterval); playInterval = null; return; }
            if (player.getCurrentTime() >= clip.endTime) {
                clearInterval(playInterval); playInterval = null;
                // al terminar un clip individual, pausar en lugar de avanzar automáticamente
                player.pauseVideo();
                isPlayingAll = false;
            }
        }, 100);
    }, 500);
}

// ─── Detener todo ────────────────────────────────────────────
function stopEverything() {
    isPlayingAll = false;
    currentPlayingIndex = -1;
    currentPlayingPlaylistId = null;
    currentEditingPlaylistId = null;
    currentEditingClipIndex  = null;

    if (playInterval)            { clearInterval(playInterval);            playInterval = null; }
    if (fragmentPreviewInterval) { clearInterval(fragmentPreviewInterval); fragmentPreviewInterval = null; }
    if (player && isPlayerReady) player.pauseVideo();

    document.getElementById('editingModeIndicator').style.display = 'none';
    updateTransportButtons();
    renderPlaylists();
}

// ─── Editar nombres ──────────────────────────────────────────
function editPlaylistName(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const n = prompt('Nombre de la playlist:', pl.name);
    if (n !== null && n.trim()) { pl.name = n.trim(); saveToLocalStorage(); renderPlaylists(); showAlert('Nombre actualizado', 'success'); }
}

function editClipName(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    const clip = pl.clips[clipIndex];
    if (!clip) return;
    const n = prompt('Nombre del fragmento:', clip.name);
    if (n !== null && n.trim()) { clip.name = n.trim(); saveToLocalStorage(); renderPlaylists(); showAlert('Nombre actualizado', 'success'); }
}

// ─── Eliminar ────────────────────────────────────────────────
function deletePlaylist(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl || !confirm(`¿Eliminar "${pl.name}"?`)) return;
    if (currentPlayingPlaylistId === playlistId) stopEverything();
    savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);
    saveToLocalStorage(); renderPlaylists();
    showAlert('Playlist eliminada', 'success');
}

function deleteClip(playlistId, clipIndex) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (!pl || !confirm('¿Eliminar este fragmento?')) return;
    pl.clips.splice(clipIndex, 1);
    saveToLocalStorage(); renderPlaylists();
    showAlert('Fragmento eliminado', 'success');
}

// ─── Renderizar playlists ────────────────────────────────────
function renderPlaylists() {
    const container = document.getElementById('playlistsContainer');

    if (savedPlaylists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
                </svg>
                <p>No tienes playlists.<br>¡Crea tu primera playlist!</p>
            </div>`;
        return;
    }

    container.innerHTML = savedPlaylists.map(pl => `
        <div class="playlist-item ${currentPlayingPlaylistId === pl.id ? 'playing' : ''}" data-playlist-id="${pl.id}">
            <div class="playlist-header-row" onclick="togglePlaylist(${pl.id})">
                <span class="playlist-name-label"
                    ondblclick="event.stopPropagation(); editPlaylistName(${pl.id})"
                    title="Doble clic para editar">${pl.name}</span>
                <div class="playlist-actions">
                    <button class="btn-play-playlist" onclick="event.stopPropagation(); playPlaylist(${pl.id})" title="Reproducir">▶</button>
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
                                title="Doble clic para editar">${clip.name || 'FRAGMENTO'}</span>
                            <div class="clip-actions-mini">
                                <button class="btn-play-clip" onclick="playClipDirect(${pl.id}, ${i})" title="Reproducir">▶</button>
                                <button class="btn-delete-clip" onclick="deleteClip(${pl.id}, ${i})" title="Eliminar">🗑</button>
                            </div>
                        </div>`).join('')}
            </div>
        </div>
    `).join('');
}

function togglePlaylist(playlistId) {
    const pl = savedPlaylists.find(p => p.id === playlistId);
    if (pl) { pl.expanded = !pl.expanded; renderPlaylists(); }
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

function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }

function handleDragEnter(e) {
    const t = e.currentTarget;
    if (parseInt(t.dataset.playlistId) === draggedPlaylistId && t !== draggedElement) t.classList.add('drag-over');
}

function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

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
    try { localStorage.setItem('youtubePlaylists', JSON.stringify(savedPlaylists)); }
    catch (e) { console.error(e); }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('youtubePlaylists');
        if (data) { savedPlaylists = JSON.parse(data); renderPlaylists(); }
    } catch (e) { console.error(e); }
}

// ─── Init ────────────────────────────────────────────────────
renderPlaylists();
