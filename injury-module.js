/**
 * Injury Display Module for Merkur Specijali
 * Integrates with /api/injuries endpoint
 */

class InjuryManager {
    constructor() {
        this.injuryData = null;
        this.teamMappings = this.loadTeamMappings();
        this.isInitialized = false;
        this.lastUpdate = null;
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes cache
    }

    // Load team mappings from localStorage
    loadTeamMappings() {
        try {
            const stored = localStorage.getItem('teamMappings');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Error loading team mappings:', error);
        }
        
        // Default mappings
        return {
            'Manchester United': ['Man United', 'MUFC', 'Man Utd', 'Manchester Utd'],
            'Manchester City': ['Man City', 'MCFC', 'City'],
            'Liverpool': ['Liverpool FC', 'LFC', 'The Reds'],
            'Arsenal': ['Arsenal FC', 'AFC', 'Gunners'],
            'Chelsea': ['Chelsea FC', 'CFC', 'Blues'],
            'Tottenham': ['Tottenham Hotspur', 'Spurs', 'THFC'],
            'Real Madrid': ['Real Madrid CF', 'Madrid', 'Los Blancos'],
            'Barcelona': ['FC Barcelona', 'Barca', 'FCB', 'Barça'],
            'Atletico Madrid': ['Atletico de Madrid', 'Atleti', 'Atletico'],
            'Juventus': ['Juventus FC', 'Juve', 'Juventus Turin'],
            'Inter Milan': ['Inter', 'Internazionale', 'Inter Milano'],
            'AC Milan': ['Milan', 'AC Milan', 'Rossoneri'],
            'Bayern Munich': ['Bayern München', 'FC Bayern', 'Bayern'],
            'Borussia Dortmund': ['BVB', 'Dortmund', 'Borussia'],
            'Paris Saint-Germain': ['PSG', 'Paris SG', 'Paris Saint Germain']
        };
    }

    // Initialize
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.loadInjuryData();
            this.addStyles();
            this.isInitialized = true;
            console.log('✅ Injury Manager initialized');
        } catch (error) {
            console.error('❌ Injury Manager initialization failed:', error);
        }
    }

    // Load injury data from API
    async loadInjuryData(forceRefresh = false) {
        // Check cache
        if (!forceRefresh && this.injuryData && this.lastUpdate) {
            const timeSinceUpdate = Date.now() - this.lastUpdate;
            if (timeSinceUpdate < this.cacheTimeout) {
                return this.injuryData;
            }
        }

        try {
            const response = await fetch('/api/injuries');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.injuryData = await response.json();
            this.lastUpdate = Date.now();
            
            console.log('✅ Injury data loaded');
            return this.injuryData;

        } catch (error) {
            console.warn('⚠️ Using fallback injury data:', error.message);
            
            // Fallback data
            this.injuryData = {
                "england-premier-league": [
                    {
                        "team": "Manchester United",
                        "player_name": "Sample Player",
                        "position": "Midfielder",
                        "info": "Connection error - demo data",
                        "expected_return": "N/A"
                    }
                ],
                "_metadata": {
                    "last_updated": new Date().toISOString(),
                    "source": "fallback"
                }
            };
            
            return this.injuryData;
        }
    }

    // Find canonical team name
    findCanonicalTeamName(searchName) {
        if (!searchName) return null;
        
        const normalized = searchName.trim().toLowerCase();
        
        // Exact match
        for (const [canonical, aliases] of Object.entries(this.teamMappings)) {
            if (canonical.toLowerCase() === normalized) {
                return canonical;
            }
            
            // Alias match
            if (aliases.some(alias => alias.toLowerCase() === normalized)) {
                return canonical;
            }
        }
        
        // Fuzzy match
        for (const [canonical, aliases] of Object.entries(this.teamMappings)) {
            const allNames = [canonical, ...aliases].map(name => name.toLowerCase());
            
            for (const name of allNames) {
                if (name.includes(normalized) || normalized.includes(name)) {
                    return canonical;
                }
            }
        }
        
        return null;
    }

    // Get team injuries
    getTeamInjuries(teamName) {
        if (!this.injuryData || !teamName) return [];
        
        const canonicalName = this.findCanonicalTeamName(teamName);
        const injuries = [];
        
        for (const [league, data] of Object.entries(this.injuryData)) {
            if (league.startsWith('_') || !Array.isArray(data)) continue;
            
            const teamInjuries = data.filter(player => {
                if (!player.team) return false;
                
                const playerTeam = player.team.toLowerCase();
                const searchTeam = teamName.toLowerCase();
                const canonical = canonicalName ? canonicalName.toLowerCase() : '';
                
                return playerTeam.includes(searchTeam) || 
                       searchTeam.includes(playerTeam) ||
                       (canonical && (playerTeam.includes(canonical) || canonical.includes(playerTeam)));
            });
            
            injuries.push(...teamInjuries);
        }
        
        return injuries;
    }

    // Get injury severity
    getInjurySeverity(injuryInfo) {
        if (!injuryInfo) return 'unknown';
        
        const info = injuryInfo.toLowerCase();
        
        if (info.match(/(long|serious|surgery|months|season|torn|rupture|fracture)/)) {
            return 'severe';
        } else if (info.match(/(minor|knock|days|bruise)/)) {
            return 'minor';
        } else if (info.match(/(doubt|test|fitness|assess)/)) {
            return 'doubtful';
        }
        
        return 'moderate';
    }

    // Create injury indicator
    createInjuryIndicator(teamName) {
        const injuries = this.getTeamInjuries(teamName);
        
        if (injuries.length === 0) {
            return '<span class="injury-badge safe" title="No injuries">✅</span>';
        }
        
        const severityCount = {
            severe: injuries.filter(i => this.getInjurySeverity(i.info) === 'severe').length,
            moderate: injuries.filter(i => this.getInjurySeverity(i.info) === 'moderate').length,
            minor: injuries.filter(i => this.getInjurySeverity(i.info) === 'minor').length,
            doubtful: injuries.filter(i => this.getInjurySeverity(i.info) === 'doubtful').length
        };
        
        if (severityCount.severe > 0) {
            return `<span class="injury-badge severe" title="🚨 ${severityCount.severe} severe injuries">🚨${injuries.length}</span>`;
        } else if (severityCount.moderate > 0) {
            return `<span class="injury-badge moderate" title="⚠️ ${injuries.length} injuries">⚠️${injuries.length}</span>`;
        } else if (severityCount.minor > 0) {
            return `<span class="injury-badge minor" title="🟡 ${injuries.length} minor injuries">🟡${injuries.length}</span>`;
        } else {
            return `<span class="injury-badge doubtful" title="❓ ${injuries.length} fitness doubts">❓${injuries.length}</span>`;
        }
    }

    // Create detailed display
    createDetailedDisplay(teamName) {
        const injuries = this.getTeamInjuries(teamName);
        
        if (injuries.length === 0) {
            return `
                <div class="injury-panel safe">
                    <div class="injury-header">
                        <h4>✅ Team Status: Healthy</h4>
                    </div>
                    <p class="no-injuries">No injury concerns reported</p>
                </div>
            `;
        }
        
        const injuryList = injuries.map(injury => `
            <div class="injury-card ${this.getInjurySeverity(injury.info)}">
                <div class="player-header">
                    <span class="player-name">${injury.player_name}</span>
                    <span class="player-position">${injury.position}</span>
                </div>
                <div class="injury-info">
                    <span class="injury-type">${injury.info}</span>
                    <span class="return-info">↩️ ${injury.expected_return !== 'N/A' ? injury.expected_return : 'Unknown'}</span>
                </div>
            </div>
        `).join('');
        
        const impact = this.calculateInjuryImpact(teamName);
        const riskLevel = impact > 15 ? 'high' : impact > 8 ? 'medium' : 'low';
        
        return `
            <div class="injury-panel has-injuries">
                <div class="injury-header">
                    <h4>🏥 Injury Report</h4>
                    <div class="injury-summary">
                        <span class="injury-count">${injuries.length} player${injuries.length !== 1 ? 's' : ''}</span>
                        <span class="risk-indicator ${riskLevel}">Risk: ${riskLevel.toUpperCase()}</span>
                    </div>
                </div>
                <div class="injury-list">${injuryList}</div>
                ${impact > 0 ? `<div class="impact-note">📊 Estimated impact: ${impact.toFixed(1)}%</div>` : ''}
            </div>
        `;
    }

    // Calculate injury impact
    calculateInjuryImpact(teamName) {
        const injuries = this.getTeamInjuries(teamName);
        if (injuries.length === 0) return 0;
        
        let impact = 0;
        
        injuries.forEach(injury => {
            const severity = this.getInjurySeverity(injury.info);
            const position = (injury.position || '').toLowerCase();
            
            let severityWeight = { severe: 4, moderate: 2.5, minor: 1, doubtful: 0.7 }[severity] || 1;
            
            let positionWeight = 1;
            if (position.includes('forward') || position.includes('striker')) positionWeight = 1.4;
            else if (position.includes('goalkeeper')) positionWeight = 1.5;
            else if (position.includes('midfielder')) positionWeight = 1.2;
            
            impact += severityWeight * positionWeight * 2.5;
        });
        
        return Math.min(impact, 30);
    }

    // Display injuries in container
    displayInjuries(teamName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} not found`);
            return;
        }
        
        container.innerHTML = this.createDetailedDisplay(teamName);
    }

    // Add injury indicator to element
    addInjuryIndicator(teamName, elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element ${elementId} not found`);
            return;
        }
        
        const indicator = this.createInjuryIndicator(teamName);
        element.insertAdjacentHTML('beforeend', ` ${indicator}`);
    }

    // Add CSS styles
    addStyles() {
        if (document.getElementById('injury-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'injury-styles';
        styles.textContent = `
            .injury-badge {
                display: inline-block;
                padding: 3px 7px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                margin-left: 6px;
                cursor: help;
                vertical-align: middle;
            }
            
            .injury-badge.safe { color: #28a745; }
            .injury-badge.severe { background: #dc3545; color: white; }
            .injury-badge.moderate { background: #fd7e14; color: white; }
            .injury-badge.minor { background: #ffc107; color: black; }
            .injury-badge.doubtful { background: #6f42c1; color: white; }
            
            .injury-panel {
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
                border: 1px solid #e9ecef;
                animation: slideIn 0.4s ease;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .injury-panel.safe { 
                background: linear-gradient(135deg, #d4edda, #c3e6cb);
                border-color: #28a745;
            }
            
            .injury-panel.has-injuries {
                background: linear-gradient(135deg, #f8d7da, #f5c6cb);
                border-color: #dc3545;
            }
            
            .injury-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .injury-header h4 {
                margin: 0;
                color: #2c3e50;
                font-size: 18px;
            }
            
            .injury-summary {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .injury-count, .risk-indicator {
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .injury-count { 
                background: rgba(0,0,0,0.15); 
                color: #495057;
            }
            
            .risk-indicator.low { background: #d1ecf1; color: #0c5460; }
            .risk-indicator.medium { background: #fff3cd; color: #856404; }
            .risk-indicator.high { background: #f8d7da; color: #721c24; }
            
            .injury-list {
                max-height: 250px;
                overflow-y: auto;
                margin: 10px 0;
            }
            
            .injury-card {
                background: rgba(255,255,255,0.9);
                border-radius: 8px;
                padding: 15px;
                margin: 8px 0;
                border-left: 4px solid;
                backdrop-filter: blur(5px);
                transition: transform 0.2s;
            }
            
            .injury-card:hover {
                transform: translateX(3px);
            }
            
            .injury-card.severe { border-left-color: #dc3545; }
            .injury-card.moderate { border-left-color: #fd7e14; }
            .injury-card.minor { border-left-color: #ffc107; }
            .injury-card.doubtful { border-left-color: #6f42c1; }
            
            .player-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .player-name {
                font-weight: 600;
                color: #2c3e50;
                font-size: 15px;
            }
            
            .player-position {
                background: #e9ecef;
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 11px;
                color: #6c757d;
                font-weight: 500;
            }
            
            .injury-info {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                gap: 10px;
            }
            
            .injury-type {
                color: #dc3545;
                font-weight: 500;
                flex: 1;
            }
            
            .return-info {
                color: #6c757d;
                white-space: nowrap;
            }
            
            .impact-note {
                text-align: center;
                margin-top: 12px;
                padding: 8px;
                background: rgba(0,0,0,0.08);
                border-radius: 6px;
                font-size: 13px;
                color: #495057;
                font-weight: 500;
            }
            
            .no-injuries {
                text-align: center;
                color: #28a745;
                font-weight: 600;
                margin: 0;
                font-size: 16px;
            }
            
            @media (max-width: 768px) {
                .injury-panel { padding: 15px; }
                .injury-header { flex-direction: column; align-items: flex-start; gap: 8px; }
                .player-header { flex-direction: column; align-items: flex-start; gap: 5px; }
                .injury-info { flex-direction: column; gap: 3px; }
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Refresh data
    async refresh() {
        await this.loadInjuryData(true);
    }
}

// Global instance
window.injuryManager = new InjuryManager();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.injuryManager.initialize();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InjuryManager;
}