const fs = require('fs');
const path = require('path');

// Initialize bumpData structure
let bumpData = {
    guilds: {}  // Will store data for each guild
};

// Function to load bump data from file
function loadBumpData() {
    try {
        const bumpDataPath = path.join(__dirname, 'bumpData.json');
        
        if (!fs.existsSync(bumpDataPath)) {
            // If the file doesn't exist, create an empty one
            fs.writeFileSync(bumpDataPath, JSON.stringify(bumpData, null, 2));
        }

        // Load the data from the JSON file
        const data = JSON.parse(fs.readFileSync(bumpDataPath, 'utf8'));

        // Make sure to return the updated data
        return data;
    } catch (error) {
        console.error('Error loading bump data:', error);
        return bumpData;
    }
}

// Function to save bump data back to the JSON file
function saveBumpData() {
    try {
        const bumpDataPath = path.join(__dirname, 'bumpData.json');
        fs.writeFileSync(bumpDataPath, JSON.stringify(bumpData, null, 2)); // Write with 2 spaces indentation
    } catch (error) {
        console.error('Error saving bump data:', error);
    }
}

module.exports = { bumpData, loadBumpData, saveBumpData };
