const express = require('express');
const fs = require('fs');
const path = require('path'); 
const { exec } = require('child_process');

const app = express();
const port = 3000;

app.use(express.json());


app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/save-coordinates', (req, res) => {
    const { clickedX, clickedY, wlcIPAddress, username, password, clientMacAddress } = req.body;

    // Write coordinates to the file
    fs.appendFileSync('locations.txt', `${clickedX},${clickedY}\n`);

    // Call the expect script
    const scriptPath = './collect_data.exp'; // Change this to the path of your script if different folder
    exec(`${scriptPath} ${wlcIPAddress} ${username} ${password} ${clientMacAddress}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    res.send({ status: 'success' });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

