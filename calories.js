document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('foodImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.querySelector('.preview-container');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const resultsContainer = document.querySelector('.results-container');
    const nutritionResults = document.querySelector('.nutrition-results');

    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                previewContainer.style.display = 'block';
                resultsContainer.style.display = 'none';
            }
            
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    analyzeBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) return;

        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        analyzeBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        fetch('https://api.calorieninjas.com/v1/imagetextnutrition', {
            method: 'POST',
            headers: {
                'X-Api-Key': 'lG1qPTEIie+Pg5O1dYYhuQ==fID2xiAmr3OtfWhL'
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            loadingSpinner.style.display = 'none';
            analyzeBtn.disabled = false;
            resultsContainer.style.display = 'block';
            
            // Clear previous results
            nutritionResults.innerHTML = '';
            
            if (result && result.predictions) {
                result.predictions.forEach(prediction => {
                    const nutritionHTML = `
                        <div class="nutrition-item">
                            <span class="nutrition-label">Name</span>
                            <span class="nutrition-value">${prediction.food_name}</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Calories</span>
                            <span class="nutrition-value">${prediction.calories} kcal</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Confidence</span>
                            <span class="nutrition-value">${(prediction.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Category</span>
                            <span class="nutrition-value">${prediction.category}</span>
                        </div>
                    `;
                    nutritionResults.innerHTML += nutritionHTML;
                });
            } else {
                nutritionResults.innerHTML = `
                    <div class="nutrition-item" style="grid-column: 1 / -1">
                        <span class="nutrition-value">Could not identify the food. Please ensure:</span>
                        <ul style="color: #8e8e93; margin-top: 10px; padding-left: 20px;">
                            <li>The food is clearly visible in the photo</li>
                            <li>The photo is well-lit and not blurry</li>
                            <li>The food takes up most of the frame</li>
                            <li>Try taking the photo from a different angle</li>
                        </ul>
                    </div>
                `;
            }
        })
        .catch(error => {
            loadingSpinner.style.display = 'none';
            analyzeBtn.disabled = false;
            nutritionResults.innerHTML = `
                <div class="nutrition-item" style="grid-column: 1 / -1">
                    <span class="nutrition-value">Error analyzing image:</span>
                    <span style="color: #8e8e93; margin-top: 5px;">${error.message}</span>
                </div>
            `;
            resultsContainer.style.display = 'block';
            console.error('Error:', error);
        });
    });
}); 