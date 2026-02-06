// ═══════════════════════════════════════════════════════════════════════════
// 🎨 BIBLIOTECA DE ICONOS SVG MINIMALISTAS
// ═══════════════════════════════════════════════════════════════════════════
// Todos los iconos están optimizados para funcionar en modo claro y oscuro
// usando currentColor para heredar el color del texto

const Icons = {
    // ─── Reproducción ───
    play: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>`,
    
    pause: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
    </svg>`,
    
    next: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="5 4 15 12 5 20 5 4"/>
        <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>`,
    
    prev: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="19 20 9 12 19 4 19 20"/>
        <line x1="5" y1="19" x2="5" y2="5"/>
    </svg>`,
    
    repeat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>`,
    
    // ─── Acciones ───
    delete: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>`,
    
    clone: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>`,
    
    edit: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`,
    
    share: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>`,
    
    add: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,
    
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    
    // ─── Favoritos ───
    star: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
    
    starFilled: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
    
    // ─── UI ───
    menu: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>`,
    
    dragHandle: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="5" r="1"/>
        <circle cx="9" cy="12" r="1"/>
        <circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="5" r="1"/>
        <circle cx="15" cy="12" r="1"/>
        <circle cx="15" cy="19" r="1"/>
    </svg>`,
    
    link: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>`,
    
    // ─── Tema ───
    sun: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`,
    
    moon: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>`
};

// Función helper para generar HTML de iconos
function getIcon(iconName, className = '') {
    const icon = Icons[iconName];
    if (!icon) {
        console.warn(`Icon "${iconName}" not found`);
        return '';
    }
    
    const iconClass = className ? `icon-${iconName} ${className}` : `icon-${iconName}`;
    return `<span class="icon ${iconClass}">${icon}</span>`;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Icons = Icons;
    window.getIcon = getIcon;
}
