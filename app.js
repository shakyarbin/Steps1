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

        // Bind methods
        this.handleMotion = this.handleMotion.bind(this);
        this.toggleTracking = this.toggleTracking.bind(this);

        // Add event listeners
        if (this.startBtn) {
            this.startBtn.addEventListener('touchstart', this.toggleTracking);
            this.startBtn.addEventListener('click', this.toggleTracking);
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
}

// Initialize the step counter
document.addEventListener('DOMContentLoaded', () => {
    new StepTracker();
}); 