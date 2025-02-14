class StepCounter {
    constructor() {
        this.steps = 0;
        this.isTracking = false;
        this.stepCountDisplay = document.getElementById('stepCount');
        this.startBtn = document.getElementById('startBtn');
        this.pointer = document.querySelector('.pointer');
        this.totalStepsToFinish = 50;
        
        // Adjusted step detection parameters
        this.lastAcceleration = 0;
        this.stepThreshold = 3.5;      // Increased threshold to reduce sensitivity
        this.minStepInterval = 400;    // Longer interval between steps
        this.accelerationReadings = [];
        this.readingsWindow = 5;       // Keep window size
        this.lastPeakTime = 0;
        this.peakThreshold = 1.1;      // Increased peak threshold for more distinct steps
        
        // Debug info
        this.debugInfo = document.createElement('div');
        this.debugInfo.style.position = 'fixed';
        this.debugInfo.style.top = '10px';
        this.debugInfo.style.left = '10px';
        this.debugInfo.style.color = 'white';
        this.debugInfo.style.zIndex = '1000';
        this.debugInfo.style.fontSize = '16px';
        this.debugInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.debugInfo.style.padding = '10px';
        document.body.appendChild(this.debugInfo);
        
        // Add debug mode for development
        this.debugMode = window.location.protocol !== 'https:'; // Automatically use debug mode only when not on HTTPS
        
        this.startBtn.addEventListener('click', () => {
            if (this.debugMode) {
                this.startTracking(); // Skip permission check in debug mode
            } else {
                this.requestAndStartTracking();
            }
        });

        // Initialize report data
        this.reportData = {
            weeklySteps: [0, 0, 0, 0, 0, 0, 0],
            dailySpeeds: [],
            totalSteps: 0
        };
        
        // Load Chart.js from CDN
        this.loadChartJS();

        // Add background tracking support
        this.wakeLock = null;
        this.isVisible = true;
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Load saved state
        const savedState = localStorage.getItem('stepCounterState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.steps = state.steps || 0;
            this.isTracking = state.isTracking || false;
            this.stepCountDisplay.textContent = this.steps.toString();
            this.updateMetrics();
            this.movePointer();

            // Auto-start if it was tracking before
            if (this.isTracking) {
                this.startTracking();
            }
        }

        // Save state before page unload
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('stepCounterState', JSON.stringify({
                steps: this.steps,
                isTracking: this.isTracking
            }));
        });

        this.startTime = null;
        this.activeMinutes = 0;
        this.lastActiveTime = Date.now();
        
        // Track active time
        setInterval(() => {
            if (this.isTracking) {
                const now = Date.now();
                const timeDiff = now - this.lastActiveTime;
                this.activeMinutes += timeDiff / 60000; // Convert ms to minutes
                this.lastActiveTime = now;
                
                // Save active time to localStorage
                localStorage.setItem('activeTime', JSON.stringify({
                    minutes: this.activeMinutes,
                    lastUpdated: now
                }));
            }
        }, 60000); // Check every minute

        // Add menu functionality
        const menuBtn = document.querySelector('.menu-btn');
        const menuDropdown = document.querySelector('.menu-dropdown');
        const resetBtn = document.getElementById('resetBtn');
        
        // Toggle menu
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', () => {
            menuDropdown.classList.remove('show');
        });
        
        // Reset functionality
        resetBtn.addEventListener('click', () => {
            this.resetSteps();
        });
    }

    async requestAndStartTracking() {
        try {
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                // iOS 13+ devices
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    this.startTracking();
                } else {
                    alert('Need motion permission to count steps');
                }
            } else {
                // Non-iOS devices
                this.startTracking();
            }
        } catch (error) {
            console.error('Error requesting motion permission:', error);
            // In debug mode, continue anyway
            if (this.debugMode) {
                this.startTracking();
            } else {
                alert('Error accessing motion sensors. Please ensure you\'re using HTTPS and a mobile device.');
            }
        }
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active');
            }
        } catch (err) {
            console.log(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }

    async handleVisibilityChange() {
        if (document.hidden) {
            this.isVisible = false;
            // Keep tracking in background
            if (this.isTracking) {
                this.showBackgroundNotification();
            }
        } else {
            this.isVisible = true;
            // Reacquire wake lock if we're tracking
            if (this.isTracking) {
                await this.requestWakeLock();
            }
        }
    }

    showBackgroundNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Step Counter Active', {
                body: 'Still counting your steps in background',
                icon: '/icon.png' // Add your icon path
            });
        }
    }

    async startTracking() {
        this.isTracking = !this.isTracking;
        
        if (this.isTracking) {
            // Request necessary permissions
            if ('Notification' in window && Notification.permission !== 'granted') {
                await Notification.requestPermission();
            }
            
            // Request wake lock
            await this.requestWakeLock();
            
            this.startBtn.textContent = 'COUNTING...';
            this.startBtn.style.backgroundColor = '#2ecc71';
            this.accelerationReadings = [];
            this.steps = 0;
            this.updateMetrics();
            this.lastPeakTime = 0;
            
            // Load saved data if exists
            const savedData = localStorage.getItem('stepCounterData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.steps = data.totalSteps || 0;
                this.stepCountDisplay.textContent = this.steps.toString();
                this.updateMetrics();
            }
            
            if (window.DeviceMotionEvent) {
                this.boundHandleMotion = this.handleMotion.bind(this);
                window.addEventListener('devicemotion', this.boundHandleMotion, true);
            } else if (this.debugMode) {
                this.debugInterval = setInterval(() => {
                    this.simulateStep();
                }, 1000);
            }
        } else {
            // Release wake lock when stopping
            if (this.wakeLock) {
                await this.wakeLock.release();
                this.wakeLock = null;
            }
            
            this.startBtn.textContent = 'START';
            this.startBtn.style.backgroundColor = '#FF9500';
            if (this.boundHandleMotion) {
                window.removeEventListener('devicemotion', this.boundHandleMotion);
            }
            if (this.debugInterval) {
                clearInterval(this.debugInterval);
            }
        }
    }

    // Add debug method to simulate steps
    simulateStep() {
        this.countStep();
        
        // Simulate acceleration values for debug display
        this.debugInfo.textContent = `
            DEBUG MODE
            Simulated step count: ${this.steps}
            Acc X: ${(Math.random() * 2).toFixed(2)}
            Acc Y: ${(Math.random() * 2).toFixed(2)}
            Acc Z: ${(9.8 + Math.random()).toFixed(2)}
        `;
    }

    handleMotion(event) {
        if (!this.isTracking) return;

        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;

        // Calculate total acceleration for better detection
        const totalAcc = Math.sqrt(
            acceleration.x * acceleration.x +
            acceleration.y * acceleration.y +
            acceleration.z * acceleration.z
        );
        
        // Add to readings array
        this.accelerationReadings.push(totalAcc);
        if (this.accelerationReadings.length > this.readingsWindow) {
            this.accelerationReadings.shift();
        }

        // Calculate moving average
        const avgAcceleration = this.accelerationReadings.reduce((a, b) => a + b, 0) 
            / this.accelerationReadings.length;

        const now = Date.now();
        const timeSinceLastStep = now - this.lastPeakTime;

        // Enhanced debug info
        this.debugInfo.textContent = `
            Total Acc: ${totalAcc.toFixed(2)}
            Last Acc: ${this.lastAcceleration.toFixed(2)}
            Avg Acc: ${avgAcceleration.toFixed(2)}
            Threshold: ${this.stepThreshold}
            Time: ${timeSinceLastStep}ms
            Steps: ${this.steps}
        `;

        // More sensitive step detection
        if (timeSinceLastStep > this.minStepInterval) {
            // Require more significant movement and clearer peaks
            if (totalAcc > this.stepThreshold && 
                totalAcc > avgAcceleration * this.peakThreshold && 
                totalAcc > this.lastAcceleration * 1.2) {  // Require 20% increase from last reading
                
                this.countStep();
                this.lastPeakTime = now;
                
                // Visual feedback
                this.debugInfo.style.backgroundColor = 'rgba(46,204,113,0.7)';
                setTimeout(() => {
                    this.debugInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
                }, 200);
            }
        }

        this.lastAcceleration = totalAcc;
    }

    countStep() {
        this.steps++;
        this.stepCountDisplay.textContent = this.steps.toString();
        
        // Store hourly steps data
        const now = new Date();
        const currentHour = `${now.getHours()}:00`;
        const currentDate = now.toDateString();
        
        // Get existing data or initialize new
        const stepsData = JSON.parse(localStorage.getItem('stepsData')) || {
            hourly: {},
            daily: {},
            weekly: {}
        };

        // Update hourly data
        if (!stepsData.hourly[currentDate]) {
            stepsData.hourly[currentDate] = {};
        }
        if (!stepsData.hourly[currentDate][currentHour]) {
            stepsData.hourly[currentDate][currentHour] = 0;
        }
        stepsData.hourly[currentDate][currentHour]++;

        // Update daily total
        if (!stepsData.daily[currentDate]) {
            stepsData.daily[currentDate] = 0;
        }
        stepsData.daily[currentDate]++;

        // Update weekly data (keep last 7 days)
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toDateString();
        });
        stepsData.weekly = Object.fromEntries(
            Object.entries(stepsData.daily)
                .filter(([date]) => last7Days.includes(date))
        );

        // Save to localStorage
        localStorage.setItem('stepsData', JSON.stringify(stepsData));
        
        // Save current state
        localStorage.setItem('stepCounterState', JSON.stringify({
            steps: this.steps,
            isTracking: this.isTracking
        }));
        
        this.movePointer();
        this.updateMetrics();
    }

    movePointer() {
        const progress = Math.min(this.steps / this.totalStepsToFinish, 1);
        
        // Get the SVG path element
        const pathElement = document.querySelector('.path-line');
        if (!pathElement) return;
        
        // Get point along the path
        const pathLength = pathElement.getTotalLength();
        const point = pathElement.getPointAtLength(pathLength * progress);
        
        // Get SVG viewBox values
        const svg = document.querySelector('.path-svg');
        const viewBox = svg.viewBox.baseVal;
        
        // Calculate position as percentage of viewBox
        const x = (point.x / viewBox.width) * 100;
        const y = (point.y / viewBox.height) * 100;
        
        // Update pointer position with offset correction
        this.pointer.style.left = `${x}%`;
        this.pointer.style.top = `${y}%`;
        
        // Add movement effect
        this.pointer.style.boxShadow = '0 0 20px rgba(255, 45, 85, 0.9)';
        setTimeout(() => {
            this.pointer.style.boxShadow = '0 0 15px rgba(255, 45, 85, 0.7)';
        }, 300);

        // Add completion effect
        if (progress >= 1) {
            this.pointer.style.backgroundColor = '#00ff00';
            this.pointer.style.borderColor = '#ffffff';
            const flag = document.querySelector('.end-point .flag');
            if (flag) {
                flag.style.animation = 'wave 1s infinite';
            }
        }
    }

    updateMetrics() {
        // Update other metrics based on steps
        const kmValue = document.querySelector('.metric:nth-child(1) .value');
        const kcalValue = document.querySelector('.metric:nth-child(2) .value');
        const minValue = document.querySelector('.metric:nth-child(3) .value');

        // Approximate calculations
        const kilometers = (this.steps * 0.0007).toFixed(2); // Average step is ~0.7 meters
        const calories = Math.round(this.steps * 0.04); // Average ~0.04 calories per step
        const minutes = Math.round(this.steps * 0.0166); // Assuming ~60 steps per minute

        kmValue.textContent = kilometers;
        kcalValue.textContent = calories;
        minValue.textContent = minutes;
    }

    loadChartJS() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => this.initializeCharts();
        document.head.appendChild(script);
    }

    initializeCharts() {
        // Weekly Steps Chart
        const weeklyCtx = document.getElementById('weeklyStepsChart');
        this.weeklyChart = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Steps',
                    data: this.reportData.weeklySteps,
                    backgroundColor: '#FF9500',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Weekly Steps',
                        color: '#ffffff'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: { color: '#8e8e93' }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: { color: '#8e8e93' }
                    }
                }
            }
        });

        // Daily Speed Chart
        const speedCtx = document.getElementById('dailySpeedChart');
        this.speedChart = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Speed',
                    data: [],
                    borderColor: '#FF2D55',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Walking Speed',
                        color: '#ffffff'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: { color: '#8e8e93' }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: { color: '#8e8e93' }
                    }
                }
            }
        });
    }

    showReportPage() {
        document.querySelector('.stats-card').style.display = 'none';
        document.querySelector('.map-card').style.display = 'none';
        document.querySelector('.report-page').style.display = 'block';
        
        // Update charts
        this.updateCharts();
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
    }

    showHomePage() {
        document.querySelector('.stats-card').style.display = 'block';
        document.querySelector('.map-card').style.display = 'block';
        document.querySelector('.report-page').style.display = 'none';
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn:first-child').classList.add('active');
    }

    updateCharts() {
        // Update weekly data
        const dayOfWeek = new Date().getDay();
        this.reportData.weeklySteps[dayOfWeek] = this.steps;
        
        // Update speed data
        this.reportData.dailySpeeds.push(this.averageSpeed * 60); // Convert to steps/minute
        
        if (this.weeklyChart && this.speedChart) {
            this.weeklyChart.data.datasets[0].data = this.reportData.weeklySteps;
            this.weeklyChart.update();

            this.speedChart.data.labels = Array(this.reportData.dailySpeeds.length).fill('');
            this.speedChart.data.datasets[0].data = this.reportData.dailySpeeds;
            this.speedChart.update();
        }

        // Update summary stats
        document.getElementById('weeklyAvg').textContent = 
            Math.round(this.reportData.weeklySteps.reduce((a, b) => a + b, 0) / 7);
        document.getElementById('bestDay').textContent = 
            Math.max(...this.reportData.weeklySteps);
        document.getElementById('totalDistance').textContent = 
            (this.steps * 0.0007).toFixed(2);
    }

    resetSteps() {
        if (confirm('Are you sure you want to reset your steps?')) {
            this.steps = 0;
            this.stepCountDisplay.textContent = '0';
            
            // Clear all stored data
            localStorage.setItem('stepsData', JSON.stringify({
                hourly: {},
                daily: {},
                weekly: {}
            }));
            
            // Reset other data
            localStorage.setItem('stepCounterState', JSON.stringify({
                steps: 0,
                isTracking: this.isTracking
            }));
            
            this.updateMetrics();
            this.movePointer();
            document.querySelector('.menu-dropdown').classList.remove('show');
        }
    }
}

// Initialize the step counter
document.addEventListener('DOMContentLoaded', () => {
    new StepCounter();
}); 