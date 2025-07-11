// commands/genel/ts3.js
const { SlashCommandBuilder } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ts3')
        .setDescription('Sunucunun TeamSpeak 3 bilgilerini gönderir.'),
    async execute(interaction) {
        const ts3Ip = (await Settings.findOne({ where: { key: 'ts3-ip' } }))?.value;

        if (ts3Ip) {
            await interaction.reply(`TeamSpeak 3 sunucumuza bağlanmak için: **${ts3Ip}**`);
        } else {
            await interaction.reply({ content: 'TeamSpeak 3 adresi henüz ayarlanmamış.', ephemeral: true });
        }
    },
};
