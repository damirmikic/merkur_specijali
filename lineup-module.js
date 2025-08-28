/**
 * Lineup Display Module for Merkur Specijali (with Debugger)
 * Integrates with /api/lineups endpoint
 */

class LineupManager {
    constructor() {
        this.lineupData = null;
        this.teamMappings = this.loadTeamMappings();
        this.isInitialized = false;
        this.lastUpdate = null;
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes cache
    }

    loadTeamMappings() {
        try {
            const stored = localStorage.getItem('teamMappings');
            if (stored) return JSON.parse(stored);
        } catch (error) {
            console.warn('Error loading team mappings for lineups:', error);
        }
        return {};
    }
    
    async initialize() {
        if (this.isInitialized) return;
        try {
            await this.loadLineupData();
            this.addStyles();
            this.isInitialized = true;
            console.log('✅ Lineup Manager initialized');
        } catch (error) {
            console.error('❌ Lineup Manager initialization failed:', error);
        }
    }

    async loadLineupData(forceRefresh = false) {
        console.groupCollapsed("LineupManager Debugger: loadLineupData");
        
        if (!forceRefresh && this.lineupData && this.lastUpdate && (Date.now() - this.lastUpdate < this.cacheTimeout)) {
            console.log("CACHE: Vraćanje podataka iz keša.");
            console.groupEnd();
            return this.lineupData;
        }

        try {
            console.log("API: Šaljem zahtev na /api/lineups...");
            const response = await fetch('/api/lineups');
            console.log(`API: Dobijen odgovor, status: ${response.status}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            this.lineupData = await response.json();
            this.lastUpdate = Date.now();

            console.info(`DATA: Uspešno preuzeto. Ukupno pronađeno postava sa servera: ${this.lineupData.length}`);
            if (this.lineupData.length > 0) {
                 console.log("RAW DATA:", this.lineupData);
            } else {
                 console.warn("UPOZORENJE: Server je vratio praznu listu. Skrejper verovatno nije uspeo. Proverite logove u terminalu.");
            }
            
            console.groupEnd();
            return this.lineupData;

        } catch (error) {
            console.error('GREŠKA: Nije uspelo preuzimanje podataka o postavama.', error.message);
            this.lineupData = [];
            console.groupEnd();
            return this.lineupData;
        }
    }

    findCanonicalTeamName(searchName) {
        if (!searchName) return null;
        const normalized = searchName.trim().toLowerCase();
        for (const [canonical, aliases] of Object.entries(this.teamMappings)) {
            if (canonical.toLowerCase() === normalized) return canonical;
            if (aliases.some(alias => alias.toLowerCase() === normalized)) return canonical;
        }
        for (const [canonical, aliases] of Object.entries(this.teamMappings)) {
            const allNames = [canonical, ...aliases].map(name => name.toLowerCase());
            for (const name of allNames) {
                if (name.includes(normalized) || normalized.includes(name)) return canonical;
            }
        }
        return searchName;
    }

    getTeamLineup(teamName) {
        console.groupCollapsed(`LineupManager Debugger: getTeamLineup for "${teamName}"`);
        if (!this.lineupData || !teamName) {
            console.warn("Nema podataka o postavama ili nije prosleđeno ime tima.");
            console.groupEnd();
            return null;
        }

        const canonicalName = this.findCanonicalTeamName(teamName);
        console.log(`MAPIRANJE: Tražim kanonsko ime za "${teamName}" -> pronađeno: "${canonicalName}"`);

        const foundLineup = this.lineupData.find(lineup => {
            const lineupCanonical = this.findCanonicalTeamName(lineup.team);
            const isMatch = lineupCanonical.toLowerCase() === canonicalName.toLowerCase();
            if(isMatch) console.log(`   -> POKLAPANJE: "${lineup.team}" (kanonski: "${lineupCanonical}")`);
            return isMatch;
        });
        
        if(foundLineup){
            console.info("USPEH: Pronađena postava.", foundLineup);
        } else {
            console.warn("GREŠKA: Nije pronađena postava za tim.", `(Traženo: "${canonicalName}")`);
        }
        
        console.groupEnd();
        return foundLineup;
    }

    createDetailedDisplay(teamName) {
        const lineup = this.getTeamLineup(teamName);

        if (!lineup || !lineup.lineup) {
            return `
                <div class="lineup-panel not-found">
                    <div class="lineup-header"><h4>ℹ️ Moguća Postava</h4></div>
                    <p class="no-lineup">Postava za tim "${teamName}" nije pronađena.</p>
                </div>
            `;
        }
        
        const players = lineup.lineup.split(/;|,/).map(p => `<span class="player-tag">${p.trim()}</span>`).join('');

        return `
            <div class="lineup-panel found">
                <div class="lineup-header">
                    <h4>📋 Moguća Postava: ${lineup.team}</h4>
                    <a href="${lineup.source_url}" target="_blank" class="source-link">Izvor</a>
                </div>
                <div class="lineup-grid">${players}</div>
            </div>
        `;
    }

    displayLineup(teamName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Lineup container ${containerId} not found`);
            return;
        }
        container.innerHTML = this.createDetailedDisplay(teamName);
    }
    
    addStyles() {
        if (document.getElementById('lineup-styles')) return;
        const styles = document.createElement('style');
        styles.id = 'lineup-styles';
        styles.textContent = `
            .lineup-panel { border-radius: 10px; padding: 15px; margin: 15px 0; border: 1px solid #e2e8f0; background: #f8fafc; }
            .lineup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .lineup-header h4 { margin: 0; color: #1e293b; font-size: 16px; font-weight: 600; }
            .source-link { font-size: 12px; color: #4f46e5; text-decoration: none; font-weight: 500; }
            .source-link:hover { text-decoration: underline; }
            .lineup-grid { display: flex; flex-wrap: wrap; gap: 8px; }
            .player-tag { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 15px; font-size: 13px; font-weight: 500; }
            .no-lineup { text-align: center; color: #64748b; font-style: italic; }
        `;
        document.head.appendChild(styles);
    }
}

// Global instance
window.lineupManager = new LineupManager();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.lineupManager.initialize();
});
