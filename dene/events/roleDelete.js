// events/roleDelete.js
const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const { Settings, GuardWhitelist } = require('../database');

// Bu fonksiyon diğer guard eventlerinde de kullanılabilir
async function guardLog(client, guild, title, executor, description) {
    const logChannelId = (await Settings.findOne({ where: { key: 'roleGuardLog' } }))?.value;
    if (!logChannelId) return;
    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle(title)
        .setDescription(description)
        .addFields({ name: 'İşlemi Yapan', value: `${executor.tag} (${executor.id})` })
        .setTimestamp();
    await logChannel.send({ embeds: [embed] });
}

module.exports = {
    name: 'roleDelete',
    async execute(role, client) {
        const guild = role.guild;
        const status = (await Settings.findOne({ where: { key: 'roleGuardStatus' } }))?.value ?? false;
        if (!status) return;

        const fetchedLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleDelete,
        });
        const log = fetchedLogs.entries.first();
        if (!log) return;

        const { executor } = log;
        if (executor.id === client.user.id) return;

        const isWhitelisted = await GuardWhitelist.findOne({ where: { userId: executor.id, action: 'roleGuard' } });
        if (isWhitelisted) return;

        // Yetkisiz işlem, kullanıcıyı cezalandır (örneğin ban)
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member && member.bannable) {
            await member.ban({ reason: 'Guard: Yetkisiz rol silme işlemi.' });
        }

        // Logla
        await guardLog(client, guild, 'Guard: Rol Silme Engellendi', executor, `**${executor.tag}** yetkisiz bir şekilde **${role.name}** rolünü silmeye çalıştı ve engellendi.`);
    },
};
