// Configuration for charts
const chartConfig = {
    colors: {
        chart1: '#80a5dc',
        chart2: '#4b8cf2',
        chart3: '#007bff',
        chart4: '#00a2e8',
        chart5: '#5bc0de',
        chart6: '#3a94ff'
    },
    spreadsheetId: '1GQUB52a2gKR429bjqJrNkbP5rjR7Z_4v85z9M7_Cr8Y',
    sheetName: 'PM1',
    posto: 1, // Posto number (line to read: posto 1 = line 2, posto 2 = line 3, etc.)
    columns: {
        chart1: 'AA', // CUBA
        chart2: 'AC', // INTERIOR
        chart3: 'AF', // TESTES
        chart4: 'AD', // ENVOLVENTES
        chart5: 'AB', // ESTRUTURA
        chart6: 'AE'  // ÁREA TÉCNICA
    }
};

/**
 * Fetches percentage value from Google Sheets PM1
 */
const fetchPercentage = async (columnName) => {
    const row = chartConfig.posto + 1; // posto 1 = row 2, posto 2 = row 3, etc.
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${chartConfig.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${chartConfig.sheetName}&range=${columnName}${row}`;

    try {
        const response = await d3.text(SHEET_URL);
        
        let rawValue = response.split('\n')[1]?.trim(); 

        if (!rawValue) {
            rawValue = response.split('\n')[0]?.trim(); 
        }

        if (!rawValue) {
            console.warn(`Empty data or unexpected format for column ${columnName}.`);
            return 0;
        }

        rawValue = rawValue.replace(/"/g, ''); 
        rawValue = rawValue.replace(',', '.'); 
        const numericMatch = rawValue.match(/^-?\d+(\.\d+)?/); 
        
        if (numericMatch) {
            const parsedValue = parseFloat(numericMatch[0]);
            
            if (!isNaN(parsedValue)) {
                return Math.min(100, Math.max(0, parsedValue));
            }
        }
        
        console.warn(`Non-numeric value found in column ${columnName}: "${rawValue}". Using 0% as fallback.`);
        return 0;

    } catch (error) {
        console.error(`Error fetching data from column ${columnName}:`, error);
        return 0; 
    }
};

/**
 * Fetches destination name from Google Sheets PM1 (Column L - PAÍS)
 */
const fetchDestination = async () => {
    const row = chartConfig.posto + 1; // posto 1 = row 2, posto 2 = row 3, etc.
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${chartConfig.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${chartConfig.sheetName}&range=L${row}`;

    try {
        const response = await d3.text(SHEET_URL);
        console.log('PAÍS response:', response);
        
        // Split by newlines and get first line (which is L2 data)
        let destination = response.split('\n')[0]?.trim(); 

        if (!destination) {
            console.warn('Empty destination data.');
            return 'Nigeria';
        }

        // Remove quotes if present
        destination = destination.replace(/^"|"$/g, ''); 
        
        console.log('Fetched destination:', destination);
        return destination;

    } catch (error) {
        console.error('Error fetching destination:', error);
        return 'Nigeria'; 
    }
};

/**
 * Updates destination card (simplified - destination is now set before globe init)
 */
const updateDestination = async () => {
    const destination = await fetchDestination();
    const destinationTitle = document.getElementById('destination-title');
    
    if (destinationTitle) {
        destinationTitle.textContent = destination;
    }
    
    window.currentDestination = destination;
    console.log('Destination card updated to:', destination);
};

/**
 * Draws a Donut Chart inside a container
 */
const drawDonutChart = (containerId, percentage, fillColor) => {
    const container = d3.select(containerId).select('.card-chart');
    container.html('');

    const containerNode = container.node();
    if (!containerNode) return;

    const rect = containerNode.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const size = Math.min(width, height) - 20;
    
    if (size <= 0) {
        return; 
    }

    const radius = size / 2;
    const innerRadius = radius * 0.65;

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

    const pie = d3.pie()
        .sort(null)
        .value(d => d.value)
        .startAngle(-Math.PI * 0.5) 
        .endAngle(Math.PI * 1.5); 

    const data = [
        { value: percentage, name: 'Filled' },
        { value: 100 - percentage, name: 'Empty' }
    ];

    // Generate unique ID for this chart
    const uniqueId = `chart-${Math.random().toString(36).substr(2, 9)}`;

    const svg = container.append('svg')
        .attr('width', size)
        .attr('height', size)
        .attr('viewBox', `0 0 ${size} ${size}`)
        .style('display', 'block')
        .style('margin', '0 auto')
        .append('g')
        .attr('transform', `translate(${size / 2}, ${size / 2})`);

    // Add gradient definitions
    const defs = svg.append('defs');
    
    // Radial gradient for filled portion
    const fillGradient = defs.append('radialGradient')
        .attr('id', `fill-gradient-${uniqueId}`)
        .attr('cx', '30%')
        .attr('cy', '30%');
    
    fillGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.rgb(fillColor).brighter(0.8))
        .attr('stop-opacity', 1);
    
    fillGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', fillColor)
        .attr('stop-opacity', 1);
    
    // Radial gradient for empty portion (lighter, more glassy)
    const emptyGradient = defs.append('radialGradient')
        .attr('id', `empty-gradient-${uniqueId}`)
        .attr('cx', '30%')
        .attr('cy', '30%');
    
    emptyGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'rgba(255, 255, 255, 0.3)')
        .attr('stop-opacity', 1);
    
    emptyGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'rgba(255, 255, 255, 0.08)')
        .attr('stop-opacity', 1);

    const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => i === 0 ? `url(#fill-gradient-${uniqueId})` : `url(#empty-gradient-${uniqueId})`)
        .attr('stroke', 'none');

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em') 
        .style('font-size', '1.8rem')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .text(`${percentage.toFixed(0)}%`);
};

/**
 * Updates all charts with data from Google Sheets
 */
const updateAllCharts = async () => {
    const charts = [
        { id: '#grid-item-1', column: chartConfig.columns.chart1, color: chartConfig.colors.chart1 },
        { id: '#grid-item-2', column: chartConfig.columns.chart2, color: chartConfig.colors.chart2 },
        { id: '#grid-item-3', column: chartConfig.columns.chart3, color: chartConfig.colors.chart3 },
        { id: '#grid-item-4', column: chartConfig.columns.chart4, color: chartConfig.colors.chart4 },
        { id: '#grid-item-5', column: chartConfig.columns.chart5, color: chartConfig.colors.chart5 },
        { id: '#grid-item-6', column: chartConfig.columns.chart6, color: chartConfig.colors.chart6 }
    ];

    for (const chart of charts) {
        const percentage = await fetchPercentage(chart.column);
        drawDonutChart(chart.id, percentage, chart.color);
    }
};

/**
 * Initializes charts on page load and window resize
 */
const initCharts = () => {
    updateAllCharts();
    
    window.addEventListener('resize', () => {
        updateAllCharts();
    });
};

/**
 * Updates EVO progress bar (Column Y)
 */
const updateEvoProgress = async () => {
    const percentage = await fetchPercentage('Y');
    const progressBar = document.getElementById('evo-progress');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
};

/**
 * Fetches info panel data from Google Sheets PM1
 */
const fetchInfoPanelData = async () => {
    const row = chartConfig.posto + 1; // posto 1 = row 2, posto 2 = row 3, etc.
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${chartConfig.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${chartConfig.sheetName}&range=A${row}:AI${row}`;

    try {
        const response = await d3.text(SHEET_URL);
        console.log('PM1 info panel response:', response);
        
        // Parse CSV response
        const values = response.split('\n')[0]?.split(',').map(v => v.replace(/^"|"$/g, '').trim()) || [];
        
        return {
            a2: values[0] || '',
            b2: values[1] || '',
            c2: values[2] || '',
            g2: values[6] || '', // Column G is index 6
            i2: values[8] || '', // Column I is index 8
            status: values[34] || ''  // Column AI is index 34 (STATUS)
        };

    } catch (error) {
        console.error('Error fetching info panel data:', error);
        return { a2: '', b2: '', c2: '', g2: '', i2: '', status: '' };
    }
};

/**
 * Updates info panel card with data
 */
const updateInfoPanel = async () => {
    const data = await fetchInfoPanelData();
    
    // Update first card with posto number
    const infoPanelCard1 = document.querySelector('.info-panel-content-1');
    if (infoPanelCard1) {
        infoPanelCard1.innerHTML = `
            <div class="info-line">${chartConfig.posto}</div>
        `;
    }
    
    // Update second card with B2, C2, G2, I2
    const infoPanelCard2 = document.querySelector('.info-panel-content-2');
    if (infoPanelCard2) {
        infoPanelCard2.innerHTML = `
            <div class="info-line">${data.b2}</div>
            <div class="info-line">${data.c2}</div>
            <div class="info-line">${data.g2}</div>
            <div class="info-line">${data.i2}</div>
        `;
    }
    
    // Update status indicator based on AI column (STATUS)
    const statusIndicator = document.getElementById('status-indicator');
    if (statusIndicator) {
        const status = data.status.toUpperCase();
        
        if (status === 'ON') {
            statusIndicator.src = 'https://static.wixstatic.com/media/a6967f_e69c4b86d193485596b9d3d2d49625c3~mv2.png';
            statusIndicator.alt = 'Status ON';
        } else if (status === 'OFF') {
            statusIndicator.src = 'https://static.wixstatic.com/media/a6967f_226d67906a30456d92ac9b34c151654a~mv2.png';
            statusIndicator.alt = 'Status OFF';
        }
    }
    
    console.log('Info panel updated with:', data);
};

/**
 * Initializes progress bar
 */
const initProgressBar = () => {
    updateEvoProgress();
    // Update every 30 seconds
    setInterval(updateEvoProgress, 30000);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initCharts();
        initProgressBar();
        updateDestination();
        updateInfoPanel();
    });
} else {
    initCharts();
    initProgressBar();
    updateDestination();
    updateInfoPanel();
}
