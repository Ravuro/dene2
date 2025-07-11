// commands/genel/ip.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ip')
        .setDescription('Sunucunun FiveM bağlantı bilgilerini gösterir.'),
    async execute(interaction) {
        // DÜZELTME: Veritabanı anahtarları tireli hale getirildi.
        const serverIp = (await Settings.findOne({ where: { key: 'sunucu-ip' } }))?.value || 'Ayarlanmamış';
        const cfxCode = (await Settings.findOne({ where: { key: 'cfx-kodu' } }))?.value || 'Ayarlanmamış';

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`${interaction.guild.name} Sunucu Bilgileri`)
            .addFields(
                { name: '🔗 Sunucu Adresi (IP)', value: `\`connect ${serverIp}\`` },
                { name: '🔗 CFX Kodu', value: `\`connect ${cfxCode}\`` }
            )
            .setFooter({ text: 'İyi oyunlar dileriz!' });

        await interaction.reply({ embeds: [embed] });
    },
};
