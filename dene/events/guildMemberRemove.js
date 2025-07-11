// events/guildMemberRemove.js
// BU YENİ BİR DOSYADIR. "events" klasörünün içine ekleyin.
const { EmbedBuilder } = require('discord.js');
const { Settings } = require('../database');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        // HG-BB Sistemi
        const hgbbChannelId = (await Settings.findOne({ where: { key: 'hgbbChannel' } }))?.value;
        if (hgbbChannelId) {
            const channel = await client.channels.fetch(hgbbChannelId).catch(() => null);
            if (channel) {
                const goodbyeEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Bir Üye Ayrıldı')
                    .setDescription(`**${member.user.tag}** aramızdan ayrıldı. Geriye **${member.guild.memberCount}** kişi kaldık.`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();
                channel.send({ embeds: [goodbyeEmbed] });
            }
        }
    },
};
