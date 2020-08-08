# Gd-Utils

.Gd-Utils is just another Tool which helps us to Bypass the 750GB daily limit by google

🌟 This is an English version of the Gd-Utils Telelgram Bot by iwestlin

    https://github.com/iwestlin/gd-utils
 
🌟 All I did is edit the code and used google translate to change chinese to English..so all Credits to the OP

🌟 I had already Have a fork from [Iwestlins](https://github.com/iwestlin) original repo - [Gd-utils running in own system](https://github.com/roshanconnor123/gd-utils)

🌟 This Part Includes Installation of Gdutils and running it using **Telegram Bot**
## General Instructions
Like Other Tools (Autorclone/Folderclone/Gclone/Fclone)  Gd-Utils is also based upon Service accounts aka SAs

.Among These tools Only Autorclone & Folderclone can generate SAs by themselves
>So for this tool to work you need SAs generated using [Autorclone](https://github.com/xyou365/AutoRclone) or [Folderclone](https://github.com/Spazzlo/folderclone)
### Pre Requisites:

1️⃣ Need a **Linux** Server - Open Up **HTTPS**,**HTTP** as well Port **23333**  ([Follow this for understanding](https://www.cyberciti.biz/faq/how-to-open-firewall-port-on-ubuntu-linux-12-04-14-04-lts/))

2️⃣ You need Generated **SAs** - Create a new Repo in Github and name it as **accounts** and Upload all your `SAs` (json files) there
>[You can Follow this Guide to understand better](https://telegra.ph/Uploading-Service-Accounts-to-Github-07-09)

3️⃣ You need a domain - Go to [Freenom](https://my.freenom.com/) and get yourself one for free ,After that add custom DNS by cloudfare
>Follow this - [Domain with Freenom and Cloudfare](https://dev.to/hieplpvip/get-a-free-domain-with-freenom-and-cloudflare-k1j#:~:text=Step%201%3A%20Go%20to%20https%3A%2F%2Fwww.cloudflare.com,Free%20and%20click%20Confirm%20plan.)

After adding your site to Cloudfare - We need to create a subdomain
>Follow this - [Subdomain in Cloudfare](https://telegra.ph/Creating-a-Subdomain-in-Cloudfare-08-05)

4️⃣ You need Bot Token - [Get it From Here](https://t.me/botfather)

## 🔳 Installation
```
git clone https://github.com/roshanconnor123/Gdutils_Tgbot
```
```
cd Gdutils_Tgbot && nano config.js
```
🔷 Scroll down and You will see the Option to add your Bot Token (Which you got from botfather) and your own Telegram Username (t.me/username)

You can see other values like Default Teamdrive ID,Client secret etc..(Optional)
```
  client_id: 'your_client_id',
  client_secret: 'your_client_secret',
  refresh_token: 'your_refrest_token',
  expires: 0, // Can be left blank
  access_token: '', // Can be left blank
  tg_token: 'bot_token', // Your telegram bot token，Go here https://core.telegram.org/bots#6-botfather
  tg_whitelist: ['your_tg_username'] // Your tg username(t.me/username)，Bot will accept command from these users, You can add multiple users if you wish to
```
>My Telegram username is `@roshanconnor` so it will be `tg_whitelist: ['roshanconnor']`
  
🔷 When you're done Pasting the Values - Type `CTRL+x` ( It will quit the editor and you will be asked if you want to save your changes ,Press `Y`and Press `Enter` )

Now run the command below 
```
sh install.sh
```
![Gdutils](https://i.ibb.co/K9FJxJW/Screenshot-759.png)

❄️ **[Follow this From now onwards](https://telegra.ph/Gdutils-Tg-Bot-08-07)**

## Usage
🔷 Go to Bot and Type `/help`
## Credits
👏 [iwestlin](https://github.com/iwestlin) - The original Developer of this tool

👏 [cgkings](https://github.com/cgkings) - I took the idea of Bash script from his Shellbot's Repo

👏[Bilibox](https://github.com/Bilibox) - For helping with the Bash script

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
[MIT](https://choosealicense.com/licenses/mit/)
