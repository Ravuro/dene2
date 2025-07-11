// events/guildMemberUpdate.js
const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const { RoleLog, Settings } = require('../database');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, client) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const fetchedLogs = await newMember.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberRoleUpdate,
        });

        const roleLog = fetchedLogs.entries.first();
        if (!roleLog) return; // Eğer log bulunamazsa işlem yapma

        const { executor, target } = roleLog;
        // Audit log'un bu üye güncellemesiyle ilgili olduğundan emin ol
        if (target.id !== newMember.id) return;

        // Ayarları çek
        const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;

        // Rol Verme Logu
        if (addedRoles.size > 0) {
            const logChannelId = (await Settings.findOne({ where: { key: 'rol-verme-log-kanal' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    for (const role of addedRoles.values()) {
                        const embed = new EmbedBuilder()
                            .setColor('#2ECC71') // Yeşil
                            .setAuthor({ name: `${newMember.guild.name} | Rol Sistemi`, iconURL: newMember.guild.iconURL() })
                            .setDescription(
                                `**Rol Veren Kişi:** ${executor} (${executor.tag})\n` +
                                `**Verilen Kişi:** ${newMember} (${newMember.user.tag})\n` +
                                `**Verilen Rol:** ${role}`
                            )
                            .setTimestamp();
                        if (website) embed.setFooter({ text: website });
                        
                        await logChannel.send({ embeds: [embed] });
                        // Veritabanına da sicil için kaydet
                        await RoleLog.create({ userId: newMember.id, moderatorId: executor.id, roleId: role.id, action: 'verildi' });
                    }
                }
            }
        }

        // Rol Alma Logu
        if (removedRoles.size > 0) {
            const logChannelId = (await Settings.findOne({ where: { key: 'rol-alma-log-kanal' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    for (const role of removedRoles.values()) {
                        const embed = new EmbedBuilder()
                            .setColor('#E74C3C') // Kırmızı
                            .setAuthor({ name: `${newMember.guild.name} | Rol Sistemi`, iconURL: newMember.guild.iconURL() })
                            .setDescription(
                                `**Rolü Alan Kişi:** ${executor} (${executor.tag})\n` +
                                `**Alınan Kişi:** ${newMember} (${newMember.user.tag})\n` +
                                `**Alınan Rol:** ${role}`
                            )
                            .setTimestamp();
                        if (website) embed.setFooter({ text: website });
                        
                        await logChannel.send({ embeds: [embed] });
                        // Veritabanına da sicil için kaydet
                        await RoleLog.create({ userId: newMember.id, moderatorId: executor.id, roleId: role.id, action: 'alındı' });
                    }
                }
            }
        }
    }
};
