// Configuration for charts
const chartConfig = {
    colors: {
        chart1: '#80a5dc',
        chart2: '#4b8cf2',
        chart3: '#007bff',
        chart4: '#00a2e8'
    },
    spreadsheetId: '1quphFwoVMjelWgxaF9jQi2qrAlHBir4Kc0LRUZRtaoY',
    sheets: {
        chart1: 'CUBA',
        chart2: 'INTERIORES',
        chart3: 'TESTES',
        chart4: 'EXTERIORES'
    }
};

/**
 * Fetches percentage value from Google Sheets
 */
const fetchPercentage = async (sheetName) => {
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${chartConfig.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}&range=A2`;

    try {
        const response = await d3.text(SHEET_URL);
        
        let rawValue = response.split('\n')[1]?.trim(); 

        if (!rawValue) {
            rawValue = response.split('\n')[0]?.trim(); 
        }

        if (!rawValue) {
            console.warn(`Empty data or unexpected format for ${sheetName}.`);
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
        
        console.warn(`Non-numeric value found in ${sheetName}: "${rawValue}". Using 0% as fallback.`);
        return 0;

    } catch (error) {
        console.error(`Error fetching data from sheet ${sheetName}:`, error);
        return 0; 
    }
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

    const svg = container.append('svg')
        .attr('width', size)
        .attr('height', size)
        .attr('viewBox', `0 0 ${size} ${size}`)
        .style('display', 'block')
        .style('margin', '0 auto')
        .append('g')
        .attr('transform', `translate(${size / 2}, ${size / 2})`);

    const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => i === 0 ? fillColor : 'rgba(255, 255, 255, 0.15)')
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
        { id: '#grid-item-1', sheet: chartConfig.sheets.chart1, color: chartConfig.colors.chart1 },
        { id: '#grid-item-2', sheet: chartConfig.sheets.chart2, color: chartConfig.colors.chart2 },
        { id: '#grid-item-3', sheet: chartConfig.sheets.chart3, color: chartConfig.colors.chart3 },
        { id: '#grid-item-4', sheet: chartConfig.sheets.chart4, color: chartConfig.colors.chart4 }
    ];

    for (const chart of charts) {
        const percentage = await fetchPercentage(chart.sheet);
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
 * Updates EVO progress bar
 */
const updateEvoProgress = async () => {
    const percentage = await fetchPercentage('EVO');
    const progressBar = document.getElementById('evo-progress');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
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
    });
} else {
    initCharts();
    initProgressBar();
}
