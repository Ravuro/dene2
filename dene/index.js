// index.js
// Ana bot giriş noktası. Botu çalıştıran ana dosyadır.

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const { sequelize } = require('./database');

// Gerekli tüm intent'leri (niyetleri) tanımlıyoruz.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent, // Reklam/küfür engeli gibi özellikler için
        GatewayIntentBits.GuildMessageReactions, // Çekilişler için
    ],
});

// Komutları saklamak için bir Collection oluşturuyoruz.
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[UYARI] ${filePath} dosyasındaki komut, gerekli "data" veya "execute" özelliğinden yoksun.`);
        }
    }
}

// Event (olay) yöneticisini yüklüyoruz.
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Veritabanı bağlantısını test et ve botu başlat
async function start() {
    try {
        await sequelize.authenticate();
        console.log('Veritabanı bağlantısı başarıyla kuruldu.');
        await sequelize.sync({ alter: true }); // Modelleri veritabanı ile senkronize et
        console.log('Tüm modeller başarıyla senkronize edildi.');
        
        client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Veritabanına bağlanılamadı:', error);
    }
}

start();
