# Gd-Utils

.Gd-Utils is just another Tool which helps us to Bypass the 750GB daily limit by google

🌟 This is an English version of the Gd-Utils Telelgram Bot by iwestlin

    https://github.com/iwestlin/gd-utils
 
🌟 All I did is edit the code and used google translate to change chinese to English..so all Credits to the OP

🌟 This Part Includes Installation of Gdutils and running it using Telegram Bot
## General Instructions
Like Other Tools (Autorclone/Folderclone/Gclone/Fclone)  Gd-Utils is also based upon Service accounts aka SAs

.Among These tools Only Autorclone & Folderclone can generate SAs by themselves
>So for this tool to work you need SAs generated using [Autorclone](https://github.com/xyou365/AutoRclone) or [Folderclone](https://github.com/Spazzlo/folderclone)
### Pre Requisites:

1️⃣ Need a **Linux** Server

2️⃣ You need Generated **SAs** - Create a new Repo in Github and name it as **accounts** and Upload all your `SAs` (json files) there
>You can Follow this Guide to understand better -  [Here](https://telegra.ph/Uploading-Service-Accounts-to-Github-07-09)

3️⃣ You need a domain - Go to [Freenom](https://my.freenom.com/) and get yourself one for free ,After that add custom DNS by cloudfare
>Follow this - [Domain with Freenom and Cloudfare](https://dev.to/hieplpvip/get-a-free-domain-with-freenom-and-cloudflare-k1j#:~:text=Step%201%3A%20Go%20to%20https%3A%2F%2Fwww.cloudflare.com,Free%20and%20click%20Confirm%20plan.)
After adding your site to Cloudfare - We need to create a subdomain
>Follow this - [Subdomain in Cloudfare](https://telegra.ph/Creating-a-Subdomain-in-Cloudfare-08-05)
##🔳 Installation
```
git clone https://github.com/roshanconnor123/Gdutils_Tgbot
```
```
cd Gdutils_Tgbot && nano config.js
```
Scroll down and You will see the Option to add your Bot Token (Which you got from botfather) and your own Telegram Username (t.me/username)

You can see other values like Default Teamdrive ID,Client secret etc..Fill them only if you wish to (Optional)
```
  client_id: 'your_client_id',
  client_secret: 'your_client_secret',
  refresh_token: 'your_refrest_token',
  expires: 0, // Can be left blank
  access_token: '', // Can be left blank
  tg_token: 'bot_token', // Your telegram bot token，Go here https://core.telegram.org/bots#6-botfather
  tg_whitelist: ['your_tg_username'] // Your tg username(t.me/username)，The bot will only execute commands sent by users in this list, You can add multiple users if you wish to
```
My Telegram username is `@roshanconnor` so it will be `tg_whitelist: ['roshanconnor']`
  
Save the file you're editing by typing `CTRL+o` ("write out"). You will be prompted for the name of the file to save - Just Press `ENTER`

When you're done, exit nano by typing `CTRL+x`

When its done - type `sh install.sh`
Follow the image below for better understanding now


## Usage
🔷 Copy Command
```bash
cd ~/gd-utils
node --max-old-space-size=1024 copy SourceFolderID DestinationFolderID -S
```
🔷 Size Command
```bash
cd ~/gd-utils
node count FolderID -S -u
node count FolderID -S -u -t tree -o tree.html (Will create tree.html inside gd-utils folder with tree like arrangament of files with size)
```
🔷 Dedupe Command
```bash
cd ~/gd-utils
node dedupe FolderID -S -u
```
🔷 Help Commands
```bash
node copy -h
node count -h
node dedupe -h
```
## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
[MIT](https://choosealicense.com/licenses/mit/)
