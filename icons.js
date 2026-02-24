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
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
    </g>
    </svg>`,
    
    clone: `<svg width="24" height="24" version="1.1" viewBox="0 0 6.35 6.35" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1.8877 0 0 1.9228 -3.0666 -2.4244)" fill="none" stroke="currentColor" stroke-width=".132" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2.9724 1.5493s-0.50091-0.21499-0.51105 0.33874"/>
        <path d="m2.4613 1.888s-0.44136-0.025767-0.36687 0.48664"/>
        <path d="m2.1394 3.421s-0.21589 0.51168 0.29887 0.53112c0 0 0.038028 0.55111 0.52156 0.33858 0 0 0.14947 0.20615 0.37969 0.20608"/>
        <path d="m2.0287 2.8372s-0.24185 0.35741 0.11069 0.58382"/>
        <path d="m2.4342 2.2478s-0.56925 0.15149-0.70827 0.42129c-0.11925 0.23142 0.36152 0.23617 0.7109 0.014662"/>
        <path d="m2.9724 1.5493s0.1858-0.24976 0.36714-0.21899"/>
        <path d="m3.2905 3.9034c-0.60708-0.055497-0.53609-0.83151-0.53609-0.83151s-0.2061-0.38157-0.11584-0.57177"/>
        <path d="m2.4342 2.2478s0.13449 0.47216 0.58165 0.17781c0 0 0.1769 0.1354 0.32366 0.096967"/>
        <path d="m3.1189 3.5361s0.10679 0.09683 0.17159 0.064575v0.30274"/>
        
        <path d="m3.6577 1.5493s0.50091-0.21499 0.51105 0.33874"/>
        <path d="m4.1687 1.888s0.44136-0.025767 0.36687 0.48664"/>
        <path d="m4.4906 3.421s0.21589 0.51168-0.29887 0.53112c0 0-0.038028 0.55111-0.52156 0.33858 0 0-0.10047 0.20615-0.33069 0.20608"/>
        <path d="m4.6013 2.8372s0.24185 0.35741-0.11069 0.58382"/>
        <path d="m4.1958 2.2478s0.56925 0.15149 0.70827 0.42129c0.11925 0.23142-0.36152 0.23617-0.7109 0.014662"/>
        <path d="m3.6577 1.5493s-0.1368-0.24976-0.31814-0.21899"/>
        <path d="m3.2905 3.9034c0.60708-0.055497 0.58509-0.83151 0.58509-0.83151s0.23146-0.39411 0.1412-0.58431"/>
        <path d="m4.1958 2.2478s-0.13449 0.47216-0.58165 0.17781c0 0-0.1279 0.1354-0.27466 0.096967"/>
        <path d="m3.5111 3.5361s-0.15579 0.09683-0.22059 0.064575v0.30274"/>
        
        <ellipse transform="rotate(-19.4)" cx="2.566" cy="3.807" rx=".06" ry=".076" fill="currentColor" stroke="none"/>
        <ellipse transform="matrix(-.94 -.33 -.33 .94 0 0)" cx="-3.69" cy="1.6" rx=".06" ry=".076" fill="currentColor" stroke="none"/>
    </g>
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
    
    link: `<svg width="24" height="24" version="1.1" viewBox="0 0 6.35 6.35" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor" stroke="none">
    <path d="m4.937 0.0629a1.1171 1.1178 0 0 1 1.3713 0.7752 1.1171 1.1178 0 0 1-0.7664 1.3769 1.1171 1.1178 0 0 1-1.3805-0.7586 1.1171 1.1178 0 0 1 0.7497-1.386" />
    <path d="m0.7326 2.3999a0.9966 0.9985 0 0 1 1.2234 0.6925 0.9966 0.9985 0 0 1-0.6838 1.2299 0.9966 0.9985 0 0 1-1.2317-0.6777 0.9966 0.9985 0 0 1 0.6689-1.2381" />
    <path d="m5.0298 4.8409a0.7668 0.7682 0 0 1 0.9413 0.5328 0.7668 0.7682 0 0 1-0.5261 0.9463 0.7668 0.7682 0 0 1-0.9476-0.5214 0.7668 0.7682 0 0 1 0.5146-0.9526" />
  </g>
  <path d="m5.4028 5.7653-4.6-2.5184 4.6-2.1569" fill="none" stroke="currentColor" stroke-width=".535" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`,

        // ─── Reproducción Automática ───
    autoplayOn: `<svg width="24" height="24" version="1.1" viewBox="0 0 6.35 6.35" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(-.021337 -.042303)">
        <g transform="matrix(1.1294 0 0 1.4002 -.95788 -1.3115)" fill="none" stroke="currentColor" stroke-width=".379" stroke-linecap="round" stroke-linejoin="round">
        <path d="m1.7273 1.1564-0.6708 0.78077 0.66096 0.82542"/>
        <path d="m1.1114 1.9549 3.8814-0.022055s0.65551-0.060741 0.64424 0.70928c-0.010225 0.69858-0.55542 0.5953-0.55542 0.5953"/>
        </g>
    </g>

    <g transform="rotate(180 3.1857 3.1962)">
        <g transform="matrix(1.1294 0 0 1.4002 -.95788 -1.3115)" fill="none" stroke="currentColor" stroke-width=".379" stroke-linecap="round" stroke-linejoin="round">
        <path d="m1.7273 1.1564-0.6708 0.78077 0.66096 0.82542"/>
        <path d="m1.1114 1.9549 3.7599-0.022055s0.65551-0.060741 0.64424 0.70928c-0.010225 0.69858-0.55542 0.5953-0.55542 0.5953"/>
        </g>
    </g>
    </svg>`,

    autoplayOff: `<svg width="24" height="24" version="1.1" viewBox="0 0 6.35 6.35" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(-.021337 -.042303)">
        <g transform="matrix(1.1294 0 0 1.4002 -.95788 -1.3115)" fill="none" stroke="currentColor" stroke-width=".37905" stroke-linecap="round" stroke-linejoin="round">
        <path d="m1.7273 1.1564-0.6708 0.78077 0.66096 0.82542"/>
        <path d="m1.1114 1.9549 3.8814-0.022055s0.65551-0.060741 0.64424 0.70928c-0.010225 0.69858-0.55542 0.5953-0.55542 0.5953"/>
        </g>
    </g>
    
    <g transform="rotate(180 3.1857 3.1962)">
        <g transform="matrix(1.1294 0 0 1.4002 -.95788 -1.3115)" fill="none" stroke="currentColor" stroke-width=".37905" stroke-linecap="round" stroke-linejoin="round">
        <path d="m1.7273 1.1564-0.6708 0.78077 0.66096 0.82542"/>
        <path d="m1.1114 1.9549 3.7599-0.022055s0.65551-0.060741 0.64424 0.70928c-0.010225 0.69858-0.55542 0.5953-0.55542 0.5953"/>
        </g>
    </g>
    
    <g transform="translate(.070048 -.057221)" fill="none" stroke="currentColor" stroke-width=".449" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2.4473 2.5782 1.3121 1.3121"/>
        <path d="m3.7626 2.5742-1.3121 1.3121"/>
    </g>
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