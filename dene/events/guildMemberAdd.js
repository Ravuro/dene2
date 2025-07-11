// events/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const { Settings } = require('../database');

/**
 * Verilen milisaniyeyi okunabilir bir süreye çevirir.
 * @param {number} ms Milisaniye cinsinden süre.
 * @returns {string} Okunabilir süre metni.
 */
function formatDuration(ms) {
    if (ms < 0) ms = -ms;
    const time = {
        gün: Math.floor(ms / 86400000),
        saat: Math.floor(ms / 3600000) % 24,
        dakika: Math.floor(ms / 60000) % 60,
    };
    // Sadece gün, saat ve dakika göster, daha temiz bir görünüm için.
    return Object.entries(time)
        .filter(val => val[1] !== 0)
        .map(([key, val]) => `${val} ${key}`)
        .join(', ');
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        // --- 1. Otorol Sistemi ---
        try {
            const otorolStatus = (await Settings.findOne({ where: { key: 'otorolStatus' } }))?.value ?? false;
            if (otorolStatus) {
                const roleId = (await Settings.findOne({ where: { key: 'otorolRole' } }))?.value;
                if (roleId) {
                    const role = member.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(role).catch(console.error);
                    }
                }
            }
        } catch (error) {
            console.error("Otorol sistemi hatası:", error);
        }

        // --- 2. HG-BB (Hoş Geldin) Sistemi ---
        try {
            const hgbbChannelId = (await Settings.findOne({ where: { key: 'hgbbChannel' } }))?.value;
            if (hgbbChannelId) {
                const channel = await client.channels.fetch(hgbbChannelId).catch(() => null);
                if (channel) {
                    const welcomeEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle('Aramıza Yeni Biri Katıldı!')
                        .setDescription(`Sunucumuza hoş geldin, ${member}! Seninle birlikte **${member.guild.memberCount}** kişi olduk.`)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();
                    await channel.send({ embeds: [welcomeEmbed] });
                }
            }
        } catch (error) {
            console.error("HG-BB sistemi hatası:", error);
        }
        
        // --- 3. Davet Takip Sistemi ---
        try {
            const davetLogChannelId = (await Settings.findOne({ where: { key: 'davetLogChannel' } }))?.value;
            if (davetLogChannelId) {
                const logChannel = await client.channels.fetch(davetLogChannelId).catch(() => null);
                if (logChannel) {
                    const cachedInvites = client.invites.get(member.guild.id);
                    const newInvites = await member.guild.invites.fetch();
                    const usedInvite = newInvites.find(inv => cachedInvites.get(inv.code) < inv.uses);
                    
                    let inviterText = "Davet eden bulunamadı (Özel URL veya süresi dolmuş davet).";
                    if (usedInvite && usedInvite.inviter) {
                        inviterText = `${usedInvite.inviter.tag} (${usedInvite.inviter.id})`;
                    }

                    const inviteLogEmbed = new EmbedBuilder()
                        .setColor('#3498DB').setTitle('Üye Katıldı (Davet Log)')
                        .addFields(
                            { name: 'Katılan Üye', value: `${member.user.tag} (${member.id})`, inline: false },
                            { name: 'Davet Eden', value: inviterText, inline: false },
                            { name: 'Kullanılan Davet Kodu', value: usedInvite ? `\`${usedInvite.code}\`` : 'Bilinmiyor', inline: false }
                        ).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
                    await logChannel.send({ embeds: [inviteLogEmbed] });
                    client.invites.set(member.guild.id, new Map(newInvites.map((invite) => [invite.code, invite.uses])));
                }
            }
        } catch (error) {
            console.error("Davet log sistemi hatası:", error);
        }

        // --- 4. Güvenlik Denetimi Sistemi ---
        try {
            const guvenlikStatus = (await Settings.findOne({ where: { key: 'guvenlikStatus' } }))?.value ?? false;
            if (guvenlikStatus) {
                const minAgeDays = (await Settings.findOne({ where: { key: 'guvenlikMinAgeDays' } }))?.value ?? 7;
                const logChannelId = (await Settings.findOne({ where: { key: 'guvenlikLogChannel' } }))?.value;
                const accountAgeMs = Date.now() - member.user.createdTimestamp;
                const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

                if (accountAgeMs < minAgeMs) {
                    if (logChannelId) {
                        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                        if (logChannel) {
                            const embed = new EmbedBuilder()
                                .setColor('#E74C3C')
                                .setAuthor({ name: `${member.guild.name} | Güvenlik Log`, iconURL: member.guild.iconURL() })
                                .setDescription(
                                    `**Sunucuya Giren Kişi:** ${member} (${member.user.tag})\n` +
                                    `**Kullanıcı Id'si:** \`${member.user.id}\`\n` +
                                    `**Hesap Oluşturma Tarihi:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>\n` +
                                    `**Süre:** ${formatDuration(accountAgeMs)} önce`
                                );
                            const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;
                            if (website) embed.setFooter({ text: website });
                            await logChannel.send({ embeds: [embed] });
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Güvenlik denetimi sistemi hatası:", error);
        }
    },
};
