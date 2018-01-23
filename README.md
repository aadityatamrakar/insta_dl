# Instagram Downloader
Instagram Profile Images Downloader 

## Setup / Installation
1. Create folders - 'dump', 'images' in root folder where '*index.js*' file is present. Command - `mkdir dump images`
2. run command - `npm install`
3. Create file '*users.json*', structure of file should be `[{username: <_username_>, password: <_password_>}, {...}]` 
4. Done!

## Usage
To get profile feed run command - `node index.js <_username_> <_profileId_>`.
This will save the result output in dump folder with <_username_>.json file.
If you want to download images with feed. `node index.js <_username_> <_profileId_> yes` 
To use different user to download from update 4th parameter with user index in users.json.