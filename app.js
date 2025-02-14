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

        // Load saved data
        this.loadSavedData();
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
    }

    stopTracking() {
        window.removeEventListener('devicemotion', this.handleMotion);
        this.isTracking = false;
        this.startBtn.textContent = 'START';
        this.startBtn.style.backgroundColor = '#32d74b';
        this.startBtn.classList.remove('active');
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
                this.updateDisplays();
            }
        } else if (deltaZ < 1) {
            this.moving = false;
        }
        
        this.lastZ = z;
    }

    updateDisplays() {
        this.stepCountDisplay.textContent = this.steps;
        this.distanceDisplay.textContent = (this.steps * 0.0007).toFixed(2);
        this.caloriesDisplay.textContent = Math.round(this.steps * 0.04);
        this.timeDisplay.textContent = Math.round(this.steps / 100);
        this.updateProgress();
        this.saveData();
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
            this.updateDisplays();
            this.menuDropdown.classList.remove('show');
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
}

// Initialize the step counter
document.addEventListener('DOMContentLoaded', () => {
    new StepTracker();
}); 