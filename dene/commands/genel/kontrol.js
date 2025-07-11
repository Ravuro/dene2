// commands/genel/kontrol.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kontrol')
        .setDescription('Botun gecikme (ping) değerlerini gösterir.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Ping ölçülüyor...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Pong! 🏓')
            .addFields(
                { name: 'Bot Gecikmesi', value: `\`${latency}ms\``, inline: true },
                { name: 'API Gecikmesi', value: `\`${apiLatency}ms\``, inline: true }
            );

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
