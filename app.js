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
            
            // Add reward icon if not already shown
            let rewardIcon = document.querySelector('.reward-icon');
            if (!rewardIcon) {
                rewardIcon = document.createElement('div');
                rewardIcon.className = 'reward-icon';
                rewardIcon.innerHTML = '🏆';
                document.querySelector('.track-container').appendChild(rewardIcon);
                
                // Trigger animation after a small delay
                setTimeout(() => {
                    rewardIcon.classList.add('show');
                }, 100);
                
                // Play celebration sound (optional)
                const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
                audio.play();
            }
        } else {
            trackDot.classList.remove('complete');
            // Remove reward icon when progress is not complete
            const rewardIcon = document.querySelector('.reward-icon');
            if (rewardIcon) {
                rewardIcon.remove();
            }
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
            // Only reset step counter data
            localStorage.setItem('stepCounterData', JSON.stringify({
                steps: 0,
                lastUpdated: Date.now()
            }));
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