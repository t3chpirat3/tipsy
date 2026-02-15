const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// This tells Express to serve static files from a 'public' folder
app.use(express.static('public'));

// This serves your main HTML file when someone visits your app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Tipsy is running on port ${PORT}`);
});
