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

        // Add menu functionality
        this.menuBtn = document.querySelector('.menu-btn');
        this.menuDropdown = document.querySelector('.menu-dropdown');
        this.resetBtn = document.getElementById('resetBtn');
        this.deleteBtn = document.getElementById('deleteBtn');

        // Bind methods
        this.handleMotion = this.handleMotion.bind(this);
        this.toggleTracking = this.toggleTracking.bind(this);

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

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetSteps();
            });
            // Add touch event for mobile
            this.resetBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.resetSteps();
            });
        }

        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSteps();
            });
            // Add touch event for mobile
            this.deleteBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.deleteSteps();
            });
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
        event.preventDefault(); // Prevent double triggering
        
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
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Motion permission denied');
            }
        }
    }

    startTracking() {
        window.addEventListener('devicemotion', this.handleMotion);
        this.isTracking = true;
        this.startBtn.textContent = 'STOP';
        this.startBtn.style.backgroundColor = '#FF453A';
    }

    stopTracking() {
        window.removeEventListener('devicemotion', this.handleMotion);
        this.isTracking = false;
        this.startBtn.textContent = 'START';
        this.startBtn.style.backgroundColor = '#FF9500';
    }

    handleMotion(event) {
        if (!this.isTracking) return;

        const z = event.accelerationIncludingGravity?.z;
        if (!z) return;

        const currentTime = Date.now();
        const deltaZ = Math.abs(z - (this.lastZ || z));
        
        if (deltaZ > 1.5 && currentTime - this.lastStepTime >= 250) {
            if (!this.moving) {
                this.steps++;
                this.lastStepTime = currentTime;
                this.moving = true;
                this.updateDisplays();
            }
        } else if (deltaZ < 0.8) {
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
        const progressLine = document.querySelector('.progress-line');
        const progressDot = document.querySelector('.progress-dot');
        const totalStepsToFinish = 100;
        const progress = Math.min(this.steps / totalStepsToFinish, 1);
        
        progressLine.style.width = `${progress * 100}%`;
        progressDot.style.left = `${progress * 100}%`;
        
        // Calculate dot position along the curved path
        const y = Math.sin(progress * Math.PI * 2) * 15;
        progressDot.style.top = `calc(50% + ${y}px)`;
        
        // Calculate rotation angle based on position
        const angle = Math.cos(progress * Math.PI * 2) * 30;
        progressDot.style.setProperty('--rotate', `${angle}deg`);
        
        if (progress >= 1) {
            progressDot.classList.add('complete');
            document.querySelector('.flag')?.style.setProperty('animation', 'wave 1s infinite');
        } else {
            progressDot.classList.remove('complete');
        }
    }

    saveData() {
        localStorage.setItem('stepCounterData', JSON.stringify({
            steps: this.steps,
            lastUpdated: Date.now()
        }));
    }

    resetSteps() {
        if (confirm('Are you sure you want to reset your steps to zero?')) {
            this.steps = 0;
            this.updateDisplays();
            this.menuDropdown.classList.remove('show');
            this.showFeedback('Steps reset successfully');
        }
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