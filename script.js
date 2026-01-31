let player;
let currentVideoId = '';
let videoDuration = 0;
let savedPlaylists = [];
let isPlayerReady = false;
let isPlayingAll = false;
let currentPlayingIndex = -1;
let currentPlayingPlaylistId = null;
let playInterval = null;
let pendingClip = null; // Fragmento pendiente de guardar
let currentEditingPlaylistId = null; // Playlist del fragmento siendo editado
let currentEditingClipIndex = null; // Índice del fragmento siendo editado
let autoSaveTimeout = null; // Timeout para auto-guardar

// Inicializar cuando la API de YouTube esté lista
function onYouTubeIframeAPIReady() {
    console.log('YouTube API lista');
}

// Extraer ID del video de la URL
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Formatear segundos a MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Mostrar alerta
function showAlert(message, type = 'error') {
    const alertId = type === 'error' ? 'errorAlert' : 'successAlert';
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.classList.add('show');
    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}

// Cargar video
function loadVideo() {
    const url = document.getElementById('videoUrl').value.trim();
    
    if (!url) {
        showAlert('Por favor, ingresa una URL de YouTube');
        return;
    }

    const videoId = extractVideoId(url);
    
    if (!videoId) {
        showAlert('URL de YouTube inválida. Asegúrate de usar el formato correcto.');
        return;
    }

    currentVideoId = videoId;
    
    // Limpiar modo de edición al cargar un video nuevo
    currentEditingPlaylistId = null;
    currentEditingClipIndex = null;
    
    // Ocultar indicador de modo edición
    document.getElementById('editingModeIndicator').style.display = 'none';
    
    if (!player) {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(videoId);
    }
}

function onPlayerReady(event) {
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
    if (event.data == YT.PlayerState.PLAYING) {
        videoDuration = player.getDuration();
        updateRangeMax();
    }
    // Cuando el video está cargado, actualizar duración
    if (event.data == YT.PlayerState.BUFFERING || event.data == YT.PlayerState.CUED) {
        setTimeout(() => {
            videoDuration = player.getDuration();
            updateRangeMax();
        }, 500);
    }
}

function updateRangeMax() {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    
    startRange.max = videoDuration;
    endRange.max = videoDuration;
    
    // Solo actualizar los valores si están en el valor por defecto
    if (endRange.value == 100 || parseFloat(endRange.value) > videoDuration) {
        endRange.value = videoDuration;
        updateTimeDisplays();
    }
}

// Actualizar displays de tiempo
function updateTimeDisplays() {
    const startTime = parseFloat(document.getElementById('startRange').value);
    const endTime = parseFloat(document.getElementById('endRange').value);
    const duration = endTime - startTime;

    document.getElementById('startTimeDisplay').textContent = formatTime(startTime);
    document.getElementById('endTimeDisplay').textContent = formatTime(endTime);
    document.getElementById('durationDisplay').textContent = formatTime(duration);

    // Actualizar visualización del rango
    const startPercent = (startTime / videoDuration) * 100;
    const endPercent = (endTime / videoDuration) * 100;
    const selection = document.getElementById('rangeSelection');
    selection.style.left = startPercent + '%';
    selection.style.width = (endPercent - startPercent) + '%';
}

// Actualizar UI con los datos del fragmento actual
function updateUIForClip(clip) {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');
    
    // Actualizar los valores max si tenemos la duración
    if (videoDuration > 0) {
        startRange.max = videoDuration;
        endRange.max = videoDuration;
    }
    
    // Actualizar los rangos con los valores del clip
    startRange.value = clip.startTime;
    endRange.value = clip.endTime;
    
    // Actualizar displays de tiempo
    document.getElementById('startTimeDisplay').textContent = formatTime(clip.startTime);
    document.getElementById('endTimeDisplay').textContent = formatTime(clip.endTime);
    document.getElementById('durationDisplay').textContent = formatTime(clip.duration);
    
    // Actualizar visualización de la barra
    if (videoDuration > 0) {
        const startPercent = (clip.startTime / videoDuration) * 100;
        const endPercent = (clip.endTime / videoDuration) * 100;
        const selection = document.getElementById('rangeSelection');
        selection.style.left = startPercent + '%';
        selection.style.width = (endPercent - startPercent) + '%';
    }
}

// Event listeners para los rangos
document.addEventListener('DOMContentLoaded', function() {
    const startRange = document.getElementById('startRange');
    const endRange = document.getElementById('endRange');

    startRange.addEventListener('input', function() {
        const startValue = parseFloat(this.value);
        const endValue = parseFloat(endRange.value);
        
        if (startValue >= endValue) {
            this.value = endValue - 1;
        }
        updateTimeDisplays();
        
        // Auto-guardar si estamos editando un fragmento guardado
        scheduleAutoSave();
    });

    endRange.addEventListener('input', function() {
        const startValue = parseFloat(startRange.value);
        const endValue = parseFloat(this.value);
        
        if (endValue <= startValue) {
            this.value = startValue + 1;
        }
        updateTimeDisplays();
        
        // Auto-guardar si estamos editando un fragmento guardado
        scheduleAutoSave();
    });
    
    // Cargar playlists guardadas
    loadFromLocalStorage();
});

// Programar auto-guardado (espera 500ms después del último cambio)
function scheduleAutoSave() {
    // Si hay un fragmento siendo editado, guardar los cambios
    if (currentEditingPlaylistId !== null && currentEditingClipIndex !== null) {
        // Cancelar timeout anterior
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        
        // Programar nuevo guardado
        autoSaveTimeout = setTimeout(() => {
            autoSaveClipChanges();
        }, 500);
    }
}

// Auto-guardar cambios en el fragmento
function autoSaveClipChanges() {
    if (currentEditingPlaylistId === null || currentEditingClipIndex === null) {
        return;
    }
    
    const playlist = savedPlaylists.find(p => p.id === currentEditingPlaylistId);
    if (!playlist || !playlist.clips[currentEditingClipIndex]) {
        return;
    }
    
    const clip = playlist.clips[currentEditingClipIndex];
    const startTime = parseFloat(document.getElementById('startRange').value);
    const endTime = parseFloat(document.getElementById('endRange').value);
    
    // Actualizar el fragmento
    clip.startTime = startTime;
    clip.endTime = endTime;
    clip.duration = endTime - startTime;
    
    // Guardar en localStorage
    saveToLocalStorage();
    
    // Actualizar visualización si la playlist está expandida
    renderPlaylists();
    
    // Mostrar feedback visual temporal
    showAutoSaveFeedback();
    
    console.log('Fragmento auto-guardado:', clip.name, formatTime(startTime), '-', formatTime(endTime));
}

// Mostrar feedback de auto-guardado
function showAutoSaveFeedback() {
    const successAlert = document.getElementById('successAlert');
    successAlert.textContent = '✓ Cambios guardados automáticamente';
    successAlert.classList.add('show');
    
    setTimeout(() => {
        successAlert.classList.remove('show');
    }, 1500);
}

// Vista previa del fragmento
function previewClip() {
    if (!player || !isPlayerReady) {
        showAlert('Primero carga un video');
        return;
    }

    const startTime = parseFloat(document.getElementById('startRange').value);
    const endTime = parseFloat(document.getElementById('endRange').value);

    player.seekTo(startTime, true);
    player.playVideo();

    // Detener al llegar al tiempo final
    const interval = setInterval(() => {
        if (player.getCurrentTime() >= endTime) {
            player.pauseVideo();
            clearInterval(interval);
        }
    }, 100);
}

// Abrir modal para guardar fragmento
function openSaveClipModal() {
    if (!player || !isPlayerReady) {
        showAlert('Primero carga un video');
        return;
    }

    const startTime = parseFloat(document.getElementById('startRange').value);
    const endTime = parseFloat(document.getElementById('endRange').value);

    if (endTime - startTime < 1) {
        showAlert('El fragmento debe tener al menos 1 segundo de duración');
        return;
    }

    // Obtener información del video
    const videoData = player.getVideoData();
    const videoTitle = videoData.title || 'Video sin título';
    
    // Limpiar y acortar el título si es muy largo
    let fragmentName = videoTitle;
    
    // Remover caracteres especiales problemáticos
    fragmentName = fragmentName.replace(/[<>:"/\\|?*]/g, '');
    
    // Limitar a 50 caracteres para que sea manejable
    if (fragmentName.length > 50) {
        fragmentName = fragmentName.substring(0, 47) + '...';
    }

    // Guardar fragmento pendiente con el nombre del video
    pendingClip = {
        id: Date.now(),
        videoId: currentVideoId,
        startTime: startTime,
        endTime: endTime,
        duration: endTime - startTime,
        name: fragmentName
    };

    // Actualizar selector de playlists
    updatePlaylistSelector();

    // Mostrar modal
    document.getElementById('saveClipModal').classList.add('show');
}

// Cerrar modal de guardar
function closeSaveClipModal() {
    document.getElementById('saveClipModal').classList.remove('show');
    pendingClip = null;
}

// Actualizar selector de playlists
function updatePlaylistSelector() {
    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">Selecciona una playlist</option>';
    
    savedPlaylists.forEach(playlist => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.name;
        select.appendChild(option);
    });
}

// Mostrar crear playlist desde modal de guardar
function showCreateFromSaveModal() {
    // NO cerramos el modal de guardar para mantener el pendingClip
    // Solo mostramos el modal de crear por encima
    document.getElementById('createPlaylistModal').classList.add('show');
}

// Guardar fragmento en playlist seleccionada
function saveClipToPlaylist() {
    const playlistId = parseInt(document.getElementById('playlistSelect').value);
    
    if (!playlistId) {
        showAlert('Por favor, selecciona una playlist');
        return;
    }
    
    if (!pendingClip) {
        showAlert('No hay fragmento para guardar');
        return;
    }
    
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) {
        showAlert('Playlist no encontrada');
        return;
    }
    
    playlist.clips.push(pendingClip);
    saveToLocalStorage();
    renderPlaylists();
    closeSaveClipModal();
    
    showAlert(`Fragmento guardado en "${playlist.name}"`, 'success');
    
    // Limpiar selección
    pendingClip = null;
}

// Nuevo video
function newVideo() {
    document.getElementById('videoUrl').value = '';
    document.getElementById('startRange').value = 0;
    document.getElementById('endRange').value = 100;
    updateTimeDisplays();
    document.getElementById('videoUrl').focus();
}

// Mostrar modal crear playlist
function showCreatePlaylistModal() {
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('createPlaylistModal').classList.add('show');
}

// Cerrar modal crear playlist
function closeCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').classList.remove('show');
}

// Crear nueva playlist
function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    
    if (!name) {
        showAlert('Por favor, ingresa un nombre para la playlist');
        return;
    }
    
    // Verificar si hay un fragmento pendiente
    const hasPendingClip = pendingClip !== null;
    console.log('Creando playlist con fragmento pendiente:', hasPendingClip, pendingClip);
    
    const newPlaylist = {
        id: Date.now(),
        name: name,
        clips: hasPendingClip ? [{ ...pendingClip }] : [], // Hacer copia del objeto
        createdAt: new Date().toISOString(),
        expanded: false
    };
    
    console.log('Nueva playlist creada:', newPlaylist);
    
    savedPlaylists.push(newPlaylist);
    saveToLocalStorage();
    renderPlaylists();
    closeCreatePlaylistModal();
    
    // Si hay un fragmento pendiente, significa que venimos del modal de guardar
    if (hasPendingClip) {
        // Cerrar el modal de guardar (solo ocultar)
        document.getElementById('saveClipModal').classList.remove('show');
        showAlert(`Playlist "${name}" creada con el fragmento`, 'success');
        pendingClip = null; // Ahora sí limpiamos
    } else {
        showAlert(`Playlist "${name}" creada`, 'success');
    }
}

// Renderizar playlists
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
            </div>
        `;
        return;
    }
    
    container.innerHTML = savedPlaylists.map(playlist => `
        <div class="playlist-item ${currentPlayingPlaylistId === playlist.id ? 'playing' : ''}" data-playlist-id="${playlist.id}">
            <div class="playlist-header-row" onclick="togglePlaylist(${playlist.id})">
                <span 
                    class="playlist-name-label" 
                    ondblclick="event.stopPropagation(); editPlaylistName(${playlist.id})"
                    title="Doble clic para editar"
                >${playlist.name}</span>
                <div class="playlist-actions">
                    <button class="btn-play-playlist" onclick="event.stopPropagation(); playPlaylist(${playlist.id})" title="Reproducir en loop">
                        ▶
                    </button>
                    <button class="btn-delete-playlist" onclick="event.stopPropagation(); deletePlaylist(${playlist.id})" title="Eliminar playlist">
                        🗑
                    </button>
                </div>
            </div>
            <div class="playlist-clips ${playlist.expanded ? 'expanded' : ''}" id="clips-${playlist.id}">
                ${playlist.clips.length === 0 ? '<p style="padding: 10px; text-align: center; color: #999;">No hay fragmentos en esta playlist</p>' : ''}
                ${playlist.clips.map((clip, index) => `
                    <div 
                        class="clip-item-mini" 
                        draggable="true"
                        data-playlist-id="${playlist.id}"
                        data-clip-index="${index}"
                        ondragstart="handleDragStart(event)"
                        ondragover="handleDragOver(event)"
                        ondragenter="handleDragEnter(event)"
                        ondragleave="handleDragLeave(event)"
                        ondrop="handleDrop(event)"
                        ondragend="handleDragEnd(event)"
                    >
                        <span class="drag-handle" title="Mantén presionado para reordenar">⋮⋮</span>
                        <span 
                            class="clip-name" 
                            ondblclick="editClipName(${playlist.id}, ${index})"
                            title="Doble clic para editar"
                        >${clip.name || 'FRAGMENTO'}</span>
                        <div class="clip-actions-mini">
                            <button class="btn-play-clip" onclick="playClipDirect(${playlist.id}, ${index})" title="Reproducir">
                                ▶
                            </button>
                            <button class="btn-delete-clip" onclick="deleteClip(${playlist.id}, ${index})" title="Eliminar">
                                🗑
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Toggle expandir/contraer playlist
function togglePlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (playlist) {
        playlist.expanded = !playlist.expanded;
        renderPlaylists();
    }
}

// Editar nombre de playlist con modal
function editPlaylistName(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const newName = prompt('Editar nombre de la playlist:', playlist.name);
    
    if (newName !== null && newName.trim()) {
        playlist.name = newName.trim();
        saveToLocalStorage();
        renderPlaylists();
        showAlert('Nombre actualizado', 'success');
    }
}

// Editar nombre de fragmento
function editClipName(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const clip = playlist.clips[clipIndex];
    if (!clip) return;
    
    const newName = prompt('Editar nombre del fragmento:', clip.name);
    
    if (newName !== null && newName.trim()) {
        clip.name = newName.trim();
        saveToLocalStorage();
        renderPlaylists();
        showAlert('Nombre del fragmento actualizado', 'success');
    }
}

// Reproducir playlist completa (siempre en loop)
function playPlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    
    if (!playlist || playlist.clips.length === 0) {
        showAlert('La playlist está vacía');
        return;
    }
    
    if (!player || !isPlayerReady) {
        showAlert('Primero carga un video para inicializar el reproductor');
        return;
    }
    
    // Detener reproducción anterior
    stopPlayback();
    
    isPlayingAll = true;
    currentPlayingIndex = 0;
    currentPlayingPlaylistId = playlistId;
    
    // Mostrar controles
    document.getElementById('playbackControls').style.display = 'flex';
    document.getElementById('playbackPlaylistName').textContent = playlist.name;
    
    renderPlaylists();
    playClipFromPlaylist(playlistId, 0);
    
    showAlert(`Reproduciendo "${playlist.name}" en loop`, 'success');
}

// Reproducir clip de playlist
function playClipFromPlaylist(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    
    if (!playlist) {
        stopPlayback();
        return;
    }
    
    // Loop: volver al inicio si llegamos al final
    if (clipIndex >= playlist.clips.length) {
        clipIndex = 0;
        currentPlayingIndex = 0;
    }
    
    const clip = playlist.clips[clipIndex];
    
    // Activar modo de edición para este fragmento
    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex = clipIndex;
    
    // Mostrar indicador de modo edición
    document.getElementById('editingModeIndicator').style.display = 'block';
    
    // Actualizar UI con los datos del fragmento actual
    updateUIForClip(clip);
    
    // Cargar video
    if (clip.videoId !== currentVideoId) {
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        currentVideoId = clip.videoId;
    } else {
        player.seekTo(clip.startTime, true);
    }
    
    setTimeout(() => {
        player.playVideo();
        
        // Actualizar videoDuration cuando el video se carga
        setTimeout(() => {
            videoDuration = player.getDuration();
            updateUIForClip(clip); // Actualizar de nuevo con la duración correcta
        }, 1000);
        
        if (playInterval) {
            clearInterval(playInterval);
        }
        
        playInterval = setInterval(() => {
            if (!isPlayingAll) {
                clearInterval(playInterval);
                return;
            }
            
            const currentTime = player.getCurrentTime();
            
            if (currentTime >= clip.endTime) {
                clearInterval(playInterval);
                currentPlayingIndex++;
                
                setTimeout(() => {
                    if (isPlayingAll) {
                        playClipFromPlaylist(playlistId, currentPlayingIndex);
                    }
                }, 500);
            }
        }, 100);
    }, 500);
}

// Reproducir clip individual directamente
function playClipDirect(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    
    if (!playlist) return;
    
    const clip = playlist.clips[clipIndex];
    
    if (!player || !isPlayerReady) {
        showAlert('Primero carga un video para inicializar el reproductor');
        return;
    }
    
    // Activar modo de edición para este fragmento
    currentEditingPlaylistId = playlistId;
    currentEditingClipIndex = clipIndex;
    
    // Mostrar indicador de modo edición
    document.getElementById('editingModeIndicator').style.display = 'block';
    
    // Actualizar UI con los datos del fragmento
    updateUIForClip(clip);
    
    // Cargar video
    if (clip.videoId !== currentVideoId) {
        player.loadVideoById({
            videoId: clip.videoId,
            startSeconds: clip.startTime
        });
        currentVideoId = clip.videoId;
    } else {
        player.seekTo(clip.startTime, true);
    }
    
    setTimeout(() => {
        player.playVideo();
        
        // Actualizar videoDuration cuando el video se carga
        setTimeout(() => {
            videoDuration = player.getDuration();
            updateUIForClip(clip); // Actualizar de nuevo con la duración correcta
        }, 1000);
        
        const interval = setInterval(() => {
            if (player.getCurrentTime() >= clip.endTime) {
                player.pauseVideo();
                clearInterval(interval);
            }
        }, 100);
    }, 500);
}

// Detener reproducción
function stopPlayback() {
    isPlayingAll = false;
    currentPlayingIndex = -1;
    currentPlayingPlaylistId = null;
    
    // Desactivar modo de edición
    currentEditingPlaylistId = null;
    currentEditingClipIndex = null;
    
    // Ocultar indicador de modo edición
    document.getElementById('editingModeIndicator').style.display = 'none';
    
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    
    if (player && isPlayerReady) {
        player.pauseVideo();
    }
    
    document.getElementById('playbackControls').style.display = 'none';
    renderPlaylists();
}

// Eliminar playlist
function deletePlaylist(playlistId) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    
    if (!playlist) return;
    
    if (!confirm(`¿Eliminar la playlist "${playlist.name}"?`)) {
        return;
    }
    
    if (currentPlayingPlaylistId === playlistId) {
        stopPlayback();
    }
    
    savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);
    saveToLocalStorage();
    renderPlaylists();
    
    showAlert('Playlist eliminada', 'success');
}

// Eliminar clip
function deleteClip(playlistId, clipIndex) {
    const playlist = savedPlaylists.find(p => p.id === playlistId);
    
    if (!playlist) return;
    
    if (!confirm('¿Eliminar este fragmento?')) {
        return;
    }
    
    playlist.clips.splice(clipIndex, 1);
    saveToLocalStorage();
    renderPlaylists();
    
    showAlert('Fragmento eliminado', 'success');
}

// Guardar en localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('youtubePlaylists', JSON.stringify(savedPlaylists));
    } catch (e) {
        console.error('Error al guardar:', e);
    }
}

// Cargar desde localStorage
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('youtubePlaylists');
        if (data) {
            savedPlaylists = JSON.parse(data);
            renderPlaylists();
        }
    } catch (e) {
        console.error('Error al cargar:', e);
    }
}

// Variables para drag and drop
let draggedElement = null;
let draggedPlaylistId = null;
let draggedClipIndex = null;

// Manejar inicio de arrastre
function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedPlaylistId = parseInt(e.currentTarget.dataset.playlistId);
    draggedClipIndex = parseInt(e.currentTarget.dataset.clipIndex);
    
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

// Manejar arrastre sobre elemento
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// Manejar entrada a zona de drop
function handleDragEnter(e) {
    const target = e.currentTarget;
    const targetPlaylistId = parseInt(target.dataset.playlistId);
    
    // Solo resaltar si es de la misma playlist
    if (targetPlaylistId === draggedPlaylistId && target !== draggedElement) {
        target.classList.add('drag-over');
    }
}

// Manejar salida de zona de drop
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

// Manejar soltar elemento
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const target = e.currentTarget;
    const targetPlaylistId = parseInt(target.dataset.playlistId);
    const targetClipIndex = parseInt(target.dataset.clipIndex);
    
    // Solo permitir reordenar dentro de la misma playlist
    if (targetPlaylistId !== draggedPlaylistId) {
        return false;
    }
    
    // No hacer nada si se suelta en el mismo lugar
    if (draggedElement === target) {
        return false;
    }
    
    // Reordenar clips
    const playlist = savedPlaylists.find(p => p.id === draggedPlaylistId);
    if (!playlist) return false;
    
    // Remover el clip de su posición original
    const [movedClip] = playlist.clips.splice(draggedClipIndex, 1);
    
    // Insertar en la nueva posición
    playlist.clips.splice(targetClipIndex, 0, movedClip);
    
    // Guardar cambios
    saveToLocalStorage();
    
    // Actualizar visualización
    renderPlaylists();
    
    // Mostrar feedback
    showAlert('Orden actualizado', 'success');
    
    return false;
}

// Manejar fin de arrastre
function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    // Limpiar todas las clases de drag-over
    document.querySelectorAll('.clip-item-mini').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    // Limpiar variables
    draggedElement = null;
    draggedPlaylistId = null;
    draggedClipIndex = null;
}

// Inicializar
renderPlaylists();