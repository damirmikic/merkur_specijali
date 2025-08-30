/**
 * Lineup Display Module for Merkur Specijali
 * Integrates with /api/lineups endpoint and a local JSON for team data
 */

class LineupManager {
    constructor() {
        this.lineupData = null;
        this.teamMappings = {}; // Počinje prazno, učitava se sa servera
        this.isInitialized = false;
        this.lastUpdate = null;
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes cache
    }

    // Učitava mapiranja iz lokalnog JSON fajla
    async loadTeamMappings() {
        try {
            const response = await fetch('/team-mappings.json');
            if (!response.ok) throw new Error('Failed to fetch local mappings');
            const data = await response.json();
            this.teamMappings = data;
            return data;
        } catch (error) {
            console.warn('Could not fetch local mappings for lineups, using empty fallback:', error);
            this.teamMappings = {};
            return this.teamMappings;
        }
    }

    // Inicijalizacija modula
    async initialize() {
        if (this.isInitialized) return;
        try {
            await this.loadTeamMappings();
            await this.loadLineupData();
            this.addStyles();
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized with local mappings`);
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
        }
    }

    async loadLineupData(forceRefresh = false) {
        if (!forceRefresh && this.lineupData && this.lastUpdate && (Date.now() - this.lastUpdate < this.cacheTimeout)) {
            return this.lineupData;
        }

        try {
            const response = await fetch('/api/lineups');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            this.lineupData = await response.json();
            this.lastUpdate = Date.now();
            console.log('✅ Lineup data loaded', this.lineupData);
            return this.lineupData;
        } catch (error) {
            console.error('⚠️ Could not load lineup data:', error.message);
            this.lineupData = []; // Reset on error
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

    // --- START DEBUG ---
    getTeamLineup(teamName) {
        if (!this.lineupData || !teamName) return null;

        console.log(`[DEBUG] Searching for team: "${teamName}"`);
        const canonicalName = this.findCanonicalTeamName(teamName);
        console.log(`[DEBUG] Resolved to canonical name: "${canonicalName}"`);

        const foundLineup = this.lineupData.find(lineup => {
            const lineupCanonical = this.findCanonicalTeamName(lineup.team);
            console.log(`[DEBUG] Comparing "${canonicalName.toLowerCase()}" with scraped team "${lineup.team}" (resolved to "${lineupCanonical.toLowerCase()}")`);
            return lineupCanonical.toLowerCase() === canonicalName.toLowerCase();
        });

        if (!foundLineup) {
            console.error(`[DEBUG] Lineup not found for "${teamName}". Please check mappings.`);
        }

        return foundLineup;
    }
    // --- END DEBUG ---

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
                <div class.
