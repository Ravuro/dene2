// commands/genel/dc.js
const { SlashCommandBuilder } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dc')
        .setDescription('Sunucunun Discord davet linkini gönderir.'),
    async execute(interaction) {
        const davetLinki = (await Settings.findOne({ where: { key: 'discord-davet' } }))?.value;

        if (davetLinki) {
            await interaction.reply(`Sunucumuza katılmak için buyurun: ${davetLinki}`);
        } else {
            await interaction.reply({ content: 'Sunucu davet linki henüz ayarlanmamış. Lütfen bir yetkiliyle iletişime geçin.', ephemeral: true });
        }
    },
};
