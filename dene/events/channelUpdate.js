// events/channelUpdate.js
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { Settings } = require('../database');

module.exports = {
    name: 'channelUpdate',
    async execute(oldChannel, newChannel, client) {
        const logChannelId = (await Settings.findOne({ where: { key: 'kanal-log' } }))?.value;
        if (!logChannelId) return;

        const logChannel = await newChannel.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const fetchedLogs = await newChannel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelUpdate,
        });
        const log = fetchedLogs.entries.first();
        if (!log) return;

        const { executor, changes } = log;
        if (executor.id === client.user.id) return;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Kanal Güncellendi')
            .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL() })
            .setTimestamp();

        let description = `${executor} tarafından ${newChannel} kanalı güncellendi.\n\n`;
        changes.forEach(change => {
            description += `**Değişiklik:** ${change.key}\n**Eski Değer:** \`${change.old || 'Yok'}\`\n**Yeni Değer:** \`${change.new || 'Yok'}\`\n`;
        });
        embed.setDescription(description);

        await logChannel.send({ embeds: [embed] });
    },
};
