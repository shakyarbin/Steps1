class ReportPage {
    constructor() {
        this.loadData();
        this.initializeCharts();
        this.updateDate();
        this.updateActivityRings();
        this.loadActivityData();
    }

    updateDate() {
        const date = new Date();
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', options).toUpperCase();
        document.querySelector('.date').textContent = formattedDate;
    }

    loadData() {
        // Get step data
        const stepData = JSON.parse(localStorage.getItem('stepCounterData')) || { steps: 0 };
        const steps = stepData.steps || 0;

        // Calculate metrics
        const distance = (steps * 0.0007).toFixed(2); // km
        const calories = Math.round(steps * 0.04);
        const minutes = Math.round(steps * 0.0166);
        const hours = Math.round(minutes / 60);

        // Update activity rings
        const movePercent = Math.min((calories / 800) * 100, 100);
        const exercisePercent = Math.min((minutes / 30) * 100, 100);
        const standPercent = Math.min((hours / 12) * 100, 100);

        // Update ring stats
        document.querySelector('.ring-stat:nth-child(1) .value').innerHTML = 
            `${calories}/800<small>CAL</small>`;
        document.querySelector('.ring-stat:nth-child(2) .value').innerHTML = 
            `${minutes}/30<small>MIN</small>`;
        document.querySelector('.ring-stat:nth-child(3) .value').innerHTML = 
            `${hours}/12<small>HRS</small>`;

        // Update rings visualization
        const rings = document.querySelector('.rings');
        if (rings) {
            rings.innerHTML = `
                <svg viewBox="0 0 100 100">
                    <circle class="ring-bg" cx="50" cy="50" r="40"/>
                    <circle class="ring-progress move-ring" cx="50" cy="50" r="40" 
                        style="stroke-dasharray: ${movePercent * 2.51}, 251"/>
                    <circle class="ring-bg" cx="50" cy="50" r="35"/>
                    <circle class="ring-progress exercise-ring" cx="50" cy="50" r="35"
                        style="stroke-dasharray: ${exercisePercent * 2.20}, 220"/>
                    <circle class="ring-bg" cx="50" cy="50" r="30"/>
                    <circle class="ring-progress stand-ring" cx="50" cy="50" r="30"
                        style="stroke-dasharray: ${standPercent * 1.88}, 188"/>
                </svg>
            `;
        }

        // Update step stats
        document.getElementById('stepCount').textContent = steps.toLocaleString();
        document.getElementById('stepDistance').textContent = distance;

        // Update trends
        this.updateTrends({
            steps,
            distance,
            minutes,
            hours,
            calories
        });
    }

    updateActivityRings() {
        const state = JSON.parse(localStorage.getItem('stepCounterState')) || { steps: 0 };
        const calories = Math.round(state.steps * 0.04);
        const minutes = Math.round(state.steps * 0.0166);
        const hours = Math.round(minutes / 60);

        // Update ring stats
        document.querySelector('.ring-stat:nth-child(1) .value').innerHTML = 
            `${calories}/800<small>CAL</small>`;
        document.querySelector('.ring-stat:nth-child(2) .value').innerHTML = 
            `${minutes}/30<small>MIN</small>`;
        document.querySelector('.ring-stat:nth-child(3) .value').innerHTML = 
            `${hours}/12<small>HRS</small>`;

        // Calculate ring percentages
        const movePercent = Math.min((calories / 800) * 100, 100);
        const exercisePercent = Math.min((minutes / 30) * 100, 100);
        const standPercent = Math.min((hours / 12) * 100, 100);

        // Update ring SVG
        const rings = document.querySelector('.rings');
        rings.innerHTML = `
            <svg viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="40"/>
                <circle class="ring-progress move-ring" cx="50" cy="50" r="40" 
                    style="stroke-dasharray: ${movePercent * 2.51}, 251"/>
                <circle class="ring-bg" cx="50" cy="50" r="35"/>
                <circle class="ring-progress exercise-ring" cx="50" cy="50" r="35"
                    style="stroke-dasharray: ${exercisePercent * 2.20}, 220"/>
                <circle class="ring-bg" cx="50" cy="50" r="30"/>
                <circle class="ring-progress stand-ring" cx="50" cy="50" r="30"
                    style="stroke-dasharray: ${standPercent * 1.88}, 188"/>
            </svg>
        `;
    }

    updateTrends(data) {
        const pace = data.minutes > 0 ? (data.distance / (data.minutes / 60)).toFixed(1) : 0;
        
        const trends = [
            { 
                label: 'Stand', 
                value: `${data.hours}/12 HR/DAY`, 
                trend: data.hours >= 8 ? 'up' : 'down'
            },
            { 
                label: 'Exercise', 
                value: `${data.minutes} MIN/DAY`, 
                trend: data.minutes >= 30 ? 'up' : 'down'
            },
            { 
                label: 'Distance', 
                value: `${data.distance} KM/DAY`, 
                trend: data.distance >= 5 ? 'up' : 'down'
            },
            { 
                label: 'Walking Pace', 
                value: `${pace} KM/H`, 
                trend: pace >= 4 ? 'up' : 'down'
            }
        ];

        const trendGrid = document.querySelector('.trends-grid');
        trendGrid.innerHTML = trends.map(trend => `
            <div class="trend-item">
                <div class="trend-icon ${trend.trend}">
                    <i class="fas fa-arrow-${trend.trend}"></i>
                </div>
                <div class="trend-info">
                    <span class="trend-label">${trend.label}</span>
                    <span class="trend-value">${trend.value}</span>
                </div>
            </div>
        `).join('');
    }

    initializeCharts() {
        // Get stored hourly data
        const hourlyData = JSON.parse(localStorage.getItem('hourlyStepsData')) || {};
        const today = new Date().toDateString();
        const todayData = hourlyData[today] || {};
        
        // Get current hour for proper time labels
        const now = new Date();
        const currentHour = now.getHours();
        
        // Generate labels for last 24 hours
        const labels = Array.from({length: 24}, (_, i) => {
            const hour = (currentHour - 23 + i + 24) % 24;
            return `${hour}:00`;
        });

        // Get actual data or use 0 for empty hours
        const data = labels.map(hour => todayData[hour] || 0);
        
        // Use fake data if no steps recorded today
        const hasData = Object.values(todayData).some(v => v > 0);
        const chartData = hasData ? data : labels.map(() => Math.floor(Math.random() * 1000) + 100);

        const ctx = document.getElementById('hourlyStepsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Steps',
                    data: chartData,
                    backgroundColor: hasData ? '#32d74b' : '#8e8e93',
                    borderRadius: 4,
                    barThickness: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                return `Hour: ${items[0].label}`;
                            },
                            label: (item) => {
                                return `Steps: ${item.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#8e8e93',
                            font: { size: 12 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#8e8e93',
                            font: { size: 12 },
                            maxTicksLimit: 6,
                            maxRotation: 0
                        }
                    }
                }
            }
        });
        this.createHourlyDistanceChart();
        this.createPaceChart();
    }

    createHourlyDistanceChart() {
        const ctx = document.getElementById('distanceHourlyChart');
        const hours = Array.from({length: 24}, (_, i) => i);
        const data = hours.map(() => Math.random() * 0.2); // Simulated hourly distance

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    data: data,
                    backgroundColor: '#32d74b',
                    borderRadius: 4,
                    barThickness: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        display: false,
                        beginAtZero: true
                    },
                    x: {
                        display: false
                    }
                }
            }
        });
    }

    createPaceChart() {
        const ctx = document.getElementById('paceChart');
        if (!ctx) return;

        const hourlySteps = JSON.parse(localStorage.getItem('hourlySteps')) || {};
        const currentHour = new Date().getHours();
        
        // Generate labels for last 24 hours
        const labels = Array.from({length: 24}, (_, i) => {
            const hour = (currentHour - 23 + i + 24) % 24;
            return `${hour}:00`;
        });

        // Calculate pace (steps per minute) for each hour
        const data = labels.map(hour => {
            const steps = hourlySteps[hour] || 0;
            return (steps / 60).toFixed(2); // steps per minute
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Steps/min',
                    data: data,
                    borderColor: '#32d74b',
                    backgroundColor: 'rgba(50, 215, 75, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#8e8e93',
                            font: { size: 10 },
                            maxTicksLimit: 5,
                            padding: 8
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#8e8e93',
                            font: { size: 10 },
                            maxTicksLimit: 4,
                            padding: 8
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    line: {
                        tension: 0.4
                    }
                }
            }
        });
    }

    updateSummary() {
        document.getElementById('weeklyAvg').textContent = 
            Math.round(this.reportData.weeklySteps.reduce((a, b) => a + b, 0) / 7);
        document.getElementById('bestDay').textContent = 
            Math.max(...this.reportData.weeklySteps);
        document.getElementById('totalDistance').textContent = 
            (this.reportData.totalSteps * 0.0007).toFixed(2);
    }

    loadActivityData() {
        const activeTimeData = JSON.parse(localStorage.getItem('activeTime')) || {
            minutes: 0,
            lastUpdated: Date.now()
        };
        
        const activeHours = Math.floor(activeTimeData.minutes / 60);
        const standHours = Math.min(activeHours, 12); // Cap at 12 hours
        
        // Update the activity rings with real data
        const rings = document.querySelector('.rings');
        if (rings) {
            const movePercent = Math.min((this.reportData.totalSteps / 800) * 100, 100);
            const exercisePercent = Math.min((activeTimeData.minutes / 30) * 100, 100);
            const standPercent = Math.min((standHours / 12) * 100, 100);
            
            rings.innerHTML = `
                <svg viewBox="0 0 100 100">
                    <circle class="ring-bg" cx="50" cy="50" r="40"/>
                    <circle class="ring-progress move-ring" cx="50" cy="50" r="40" 
                        style="stroke-dasharray: ${movePercent * 2.51}, 251"/>
                    <circle class="ring-bg" cx="50" cy="50" r="35"/>
                    <circle class="ring-progress exercise-ring" cx="50" cy="50" r="35"
                        style="stroke-dasharray: ${exercisePercent * 2.20}, 220"/>
                    <circle class="ring-bg" cx="50" cy="50" r="30"/>
                    <circle class="ring-progress stand-ring" cx="50" cy="50" r="30"
                        style="stroke-dasharray: ${standPercent * 1.88}, 188"/>
                </svg>
            `;

            // Update ring stats
            document.querySelector('.ring-stat:nth-child(1) .value').innerHTML = 
                `${this.reportData.totalSteps}/800<small>CAL</small>`;
            document.querySelector('.ring-stat:nth-child(2) .value').innerHTML = 
                `${Math.round(activeTimeData.minutes)}/30<small>MIN</small>`;
            document.querySelector('.ring-stat:nth-child(3) .value').innerHTML = 
                `${standHours}/12<small>HRS</small>`;
        }
    }
}

// Initialize the report page
document.addEventListener('DOMContentLoaded', () => {
    new ReportPage();
});

function updateStats(data) {
    // Update step count
    document.getElementById('stepCount').textContent = data.steps || 0;
    
    // Update distance (km) - assuming average step length of 0.7 meters
    const distanceKm = ((data.steps || 0) * 0.0007).toFixed(2);
    document.getElementById('stepDistance').textContent = distanceKm;
    
    // Update calories
    const calories = Math.round((data.steps || 0) * 0.04);
    document.getElementById('moveValue').textContent = `${calories}/800`;
    
    // Update exercise minutes (assuming 100 steps per minute)
    const minutes = Math.round((data.steps || 0) / 100);
    document.getElementById('exerciseValue').textContent = `${minutes}/30`;
    
    // Calculate speed (km/h)
    const hours = minutes / 60;
    const speed = hours > 0 ? (distanceKm / hours).toFixed(1) : 0;
    
    // Update trends
    updateTrends(speed, distanceKm);
}

function updateTrends(speed, distance) {
    const trends = document.querySelectorAll('.trend-value');
    trends[2].textContent = `${distance}KM/DAY`;
    trends[3].textContent = `${speed}KM/H`;
}

function initializeHourlyChart() {
    const ctx = document.getElementById('hourlyStepsChart').getContext('2d');
    
    // Get current hour
    const currentHour = new Date().getHours();
    
    // Generate labels for last 24 hours
    const labels = Array.from({length: 24}, (_, i) => {
        const hour = (currentHour - 23 + i + 24) % 24;
        return `${hour}:00`;
    });
    
    // Get hourly data from localStorage or generate empty data
    const hourlyData = JSON.parse(localStorage.getItem('hourlySteps') || '[]');
    const data = new Array(24).fill(0);
    hourlyData.forEach(entry => {
        const hour = new Date(entry.timestamp).getHours();
        data[hour] += entry.steps;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Steps',
                data: data,
                backgroundColor: 'rgba(255, 149, 0, 0.5)',
                borderColor: 'rgba(255, 149, 0, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#8e8e93'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8e8e93',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
} 