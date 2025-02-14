class StepTracker {
    constructor() {
        this.steps = 0;
        this.lastZ = null;
        this.moving = false;
        this.lastStepTime = 0;
        this.isTracking = false;

        // Get DOM elements
        this.stepCountDisplay = document.getElementById('stepCount');
        this.distanceDisplay = document.getElementById('distanceValue');
        this.caloriesDisplay = document.getElementById('caloriesValue');
        this.timeDisplay = document.getElementById('timeValue');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtnOutside = document.getElementById('resetBtnOutside');

        // Add menu functionality
        this.menuBtn = document.querySelector('.menu-btn');
        this.menuDropdown = document.querySelector('.menu-dropdown');
        this.resetBtn = document.getElementById('resetBtn');
        this.deleteBtn = document.getElementById('deleteBtn');

        // Bind methods
        this.handleMotion = this.handleMotion.bind(this);
        this.toggleTracking = this.toggleTracking.bind(this);
        this.resetSteps = this.resetSteps.bind(this);
        this.deleteSteps = this.deleteSteps.bind(this);

        // Add event listeners
        if (this.startBtn) {
            this.startBtn.addEventListener('touchstart', this.toggleTracking);
            this.startBtn.addEventListener('click', this.toggleTracking);
        }

        // Add menu event listeners
        if (this.menuBtn && this.menuDropdown) {
            this.menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.menuDropdown.classList.toggle('show');
            });

            // Add touch event for mobile
            this.menuBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.menuDropdown.classList.toggle('show');
            });
        }

        // Add reset and delete button listeners
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetSteps();
            });
        }
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', this.deleteSteps);
        }

        // Close menu when clicking/touching outside
        document.addEventListener('click', () => {
            this.menuDropdown.classList.remove('show');
        });
        document.addEventListener('touchstart', (e) => {
            if (!this.menuBtn.contains(e.target) && !this.menuDropdown.contains(e.target)) {
                this.menuDropdown.classList.remove('show');
            }
        });

        // Add outside reset button listener
        if (this.resetBtnOutside) {
            this.resetBtnOutside.addEventListener('click', this.resetSteps);
            this.resetBtnOutside.addEventListener('touchstart', (e) => {
                e.preventDefault();
            this.resetSteps();
        });
    }

        // Initialize chart
        this.initializeChart();
        
        // Load saved data
        this.loadSavedData();

        // Initialize bots
        this.bots = [
            { element: document.querySelector('.bot1'), progress: 0, speed: 0.001 },
            { element: document.querySelector('.bot2'), progress: 0, speed: 0.0015 },
            { element: document.querySelector('.bot3'), progress: 0, speed: 0.0008 }
        ];
        
        // Initialize bot positions
        this.resetBotPositions();
        this.isBotsMoving = false;
    }

    initializeChart() {
        const ctx = document.getElementById('hourlyStepsChart');
        const emptyMessage = document.getElementById('emptyChartMessage');
        
        if (!ctx) return;

        // Get hourly data from storage or initialize empty
        const hourlyData = JSON.parse(localStorage.getItem('hourlyStepsData')) || {};
        const today = new Date().toDateString();
        const todayData = hourlyData[today] || {};
        const currentHour = new Date().getHours();
        
        // Generate labels for last 24 hours
        const labels = Array.from({length: 24}, (_, i) => {
            const hour = (currentHour - 23 + i + 24) % 24;
            return `${hour}:00`;
        });

        // Get data for each hour
        const data = labels.map(hour => todayData[hour] || 0);
        
        // Show empty state if no steps
        if (data.every(value => value === 0)) {
            ctx.style.display = 'none';
            emptyMessage.style.display = 'block';
            return;
        }

        ctx.style.display = 'block';
        emptyMessage.style.display = 'none';

        this.stepsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: '#32d74b',
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
                            title: (items) => `Hour: ${items[0].label}`,
                            label: (item) => `Steps: ${item.raw.toLocaleString()}`
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
                            maxTicksLimit: 6
                        }
                    }
                }
            }
        });
    }

    loadSavedData() {
        const savedData = localStorage.getItem('stepCounterData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.steps = data.steps || 0;
            this.updateDisplays();
        }
    }

    async toggleTracking(event) {
        event.preventDefault();
        
        if (!this.isTracking) {
            try {
                await this.requestMotionPermission();
                this.startTracking();
            } catch (error) {
                console.error('Failed to start tracking:', error);
                alert('Please ensure motion permissions are granted and you are using a mobile device');
            }
        } else {
            this.stopTracking();
        }
    }

    async requestMotionPermission() {
        if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
            if (typeof DeviceMotionEvent.requestPermission === "function") {
                const permissionState = await DeviceMotionEvent.requestPermission();
                if (permissionState !== "granted") {
                    throw new Error("Motion permission denied. Please enable it in device settings.");
                }
            }
        } else {
            throw new Error("Device motion not supported on this device");
        }
    }

    startTracking() {
        window.addEventListener('devicemotion', this.handleMotion);
        this.isTracking = true;
        this.startBtn.textContent = 'STOP';
        this.startBtn.style.backgroundColor = '#FF453A';
        this.startBtn.classList.add('active');
        // Start bot animation when tracking starts
        this.isBotsMoving = true;
        if (!this.animationFrame) {
            this.animateBots();
        }
    }

    stopTracking() {
        window.removeEventListener('devicemotion', this.handleMotion);
        this.isTracking = false;
        this.startBtn.textContent = 'START';
        this.startBtn.style.backgroundColor = '#32d74b';
        this.startBtn.classList.remove('active');
        // Stop bot animation when tracking stops
        this.isBotsMoving = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    handleMotion(event) {
        if (!this.isTracking) return;

        const z = event.accelerationIncludingGravity.z;
        if (z === null) return;

        const currentTime = Date.now();
        const deltaZ = Math.abs(z - (this.lastZ || z));
        
        if (deltaZ > 2 && currentTime - this.lastStepTime >= 333) {
            if (!this.moving) {
                this.steps++;
                this.lastStepTime = currentTime;
                this.moving = true;
                this.updateHourlySteps();
                this.updateDisplays();
            }
        } else if (deltaZ < 1) {
            this.moving = false;
        }
        
        this.lastZ = z;
    }

    updateHourlySteps() {
        const now = new Date();
        const hourKey = `${now.getHours()}:00`;
        const dateKey = now.toDateString();

        // Get stored data
        const hourlyData = JSON.parse(localStorage.getItem('hourlyStepsData')) || {};
        
        // Initialize date if not exists
        if (!hourlyData[dateKey]) {
            hourlyData[dateKey] = {};
        }
        
        // Increment steps for current hour
        hourlyData[dateKey][hourKey] = (hourlyData[dateKey][hourKey] || 0) + 1;
        
        // Store updated data
        localStorage.setItem('hourlyStepsData', JSON.stringify(hourlyData));
    }

    updateDisplays() {
        this.stepCountDisplay.textContent = this.steps;
        this.distanceDisplay.textContent = (this.steps * 0.0007).toFixed(2);
        this.caloriesDisplay.textContent = Math.round(this.steps * 0.04);
        this.timeDisplay.textContent = Math.round(this.steps / 100);
        this.updateProgress();
        this.saveData();

        // Update hourly steps
        const hour = new Date().getHours() + ':00';
        const hourlySteps = JSON.parse(localStorage.getItem('hourlySteps')) || {};
        hourlySteps[hour] = (hourlySteps[hour] || 0) + 1;
        localStorage.setItem('hourlySteps', JSON.stringify(hourlySteps));

        // Update chart if it exists
        if (this.stepsChart) {
            const dataset = this.stepsChart.data.datasets[0];
            const hourIndex = this.stepsChart.data.labels.indexOf(hour);
            if (hourIndex !== -1) {
                dataset.data[hourIndex] = hourlySteps[hour];
                this.stepsChart.update();
            }
        }
    }

    updateProgress() {
        const progress = document.querySelector('.progress');
        const trackDot = document.querySelector('.track-dot');
        const totalStepsToFinish = 100;
        const progressValue = Math.min(this.steps / totalStepsToFinish, 1);
        
        // Update progress path
        const pathLength = progress.getTotalLength();
        progress.style.strokeDashoffset = pathLength - (pathLength * progressValue);
        
        // Update dot position
        const point = progress.getPointAtLength(pathLength * progressValue);
        trackDot.style.left = `${point.x}px`;
        trackDot.style.top = `${point.y}px`;
        
        // Calculate dot rotation
        if (progressValue < 1) {
            const nextPoint = progress.getPointAtLength(Math.min(pathLength * progressValue + 1, pathLength));
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
            trackDot.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }
        
        if (progressValue >= 1) {
            trackDot.classList.add('complete');
            document.querySelector('.flag')?.style.setProperty('animation', 'wave 1s infinite');
        } else {
            trackDot.classList.remove('complete');
        }
    }

    saveData() {
        localStorage.setItem('stepCounterData', JSON.stringify({
            steps: this.steps,
            lastUpdated: Date.now()
        }));
    }

    deleteSteps() {
        if (confirm('Are you sure you want to delete all steps? This cannot be undone.')) {
            this.steps = 0;
            localStorage.removeItem('stepCounterData');
            this.updateDisplays();
            this.menuDropdown.classList.remove('show');
            this.showFeedback('All data deleted successfully');
        }
    }

    resetSteps() {
        if (confirm('Are you sure you want to reset your steps to zero?')) {
            this.steps = 0;
            localStorage.setItem('stepCounterData', JSON.stringify({
                steps: 0,
                lastUpdated: Date.now()
            }));
            this.updateDisplays();
            this.menuDropdown.classList.remove('show');
            // Reset bot positions when steps are reset
            this.resetBotPositions();
            // Stop bots if they were moving
            this.isBotsMoving = false;
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            this.showFeedback('Steps reset successfully');
        }
    }

    showFeedback(message) {
        const feedback = document.createElement('div');
        feedback.className = 'feedback-toast';
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        // Trigger animation
        setTimeout(() => feedback.classList.add('show'), 10);
        
        // Remove after animation
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    resetBotPositions() {
        const progress = document.querySelector('.progress');
        if (!progress) return;
        
        this.bots.forEach(bot => {
            bot.progress = 0;
            const point = progress.getPointAtLength(0);
            bot.element.style.left = `${point.x}px`;
            bot.element.style.top = `${point.y}px`;
            bot.element.style.transform = 'translate(-50%, -50%)';
            bot.speed = Math.random() * 0.001 + 0.0005; // Random speed between 0.0005 and 0.0015
        });
    }

    animateBots() {
        const progress = document.querySelector('.progress');
        if (!progress) return;
        
        const pathLength = progress.getTotalLength();
        
        const updateBot = (bot) => {
            if (!this.isBotsMoving) return;
            bot.progress += bot.speed * (Math.random() * 0.5 + 0.75); // Random speed variation
            if (bot.progress >= 1) bot.progress = 0;
            
            const point = progress.getPointAtLength(pathLength * bot.progress);
            bot.element.style.left = `${point.x}px`;
            bot.element.style.top = `${point.y}px`;
            
            // Calculate rotation based on path direction
            const nextPoint = progress.getPointAtLength(Math.min(pathLength * (bot.progress + 0.01), pathLength));
            const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
            bot.element.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            
            // Check if bot passes the player
            const playerProgress = 1 - (progress.style.strokeDashoffset.replace('px', '') / pathLength);
            if (Math.abs(bot.progress - playerProgress) < 0.02) {
                bot.element.classList.add('passing');
                setTimeout(() => bot.element.classList.remove('passing'), 500);
            }
        };
        
        // Update bot positions
        const animate = () => {
            this.bots.forEach(updateBot);
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// Initialize the step counter
document.addEventListener('DOMContentLoaded', () => {
    new StepTracker();
}); 