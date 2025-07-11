// commands/moderasyon/kick.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');
const { checkPermission } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .addUserOption(option => option.setName('kullanıcı').setDescription('Atılacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),
    async execute(interaction, client) {
        if (!await checkPermission(interaction, 'kick-yetki')) return;
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) return interaction.editReply({ content: 'Kullanıcı bu sunucuda bulunamadı.' });
        if (!targetMember.kickable) return interaction.editReply({ content: 'Bu kullanıcıyı atmak için yetkim yok.' });

        await targetMember.kick(reason);
        await interaction.editReply(`**${targetUser.tag}** başarıyla sunucudan atıldı.`);

        const logChannelId = (await Settings.findOne({ where: { key: 'kick-log-kanal' } }))?.value;
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;
                const embed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setTitle('Kullanıcı Atıldı')
                    .addFields(
                        { name: 'Atılan Kullanıcı', value: targetUser.toString(), inline: true },
                        { name: 'Atan Yetkili', value: interaction.user.toString(), inline: true },
                        { name: 'Sebep', value: reason }
                    )
                    .setTimestamp();
                if (website) embed.setFooter({ text: `Kick Sistemi | ${website}` });
                await logChannel.send({ embeds: [embed] });
            }
        }
    },
};
