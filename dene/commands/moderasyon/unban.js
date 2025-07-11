// commands/moderasyon/unban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');
const { checkPermission } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Bir kullanıcının yasağını kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addStringOption(option => option.setName('kullanici-id').setDescription('Yasağı kaldırılacak kullanıcının ID\'si').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Yasak kaldırma sebebi').setRequired(false)),
    async execute(interaction, client) {
        if (!await checkPermission(interaction, 'ban-yetki')) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const userId = interaction.options.getString('kullanici-id');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        try {
            const bannedUser = await client.users.fetch(userId);
            await interaction.guild.bans.remove(bannedUser, reason);

            await interaction.editReply(`**${bannedUser.tag}** adlı kullanıcının yasağı başarıyla kaldırıldı.`);

            const logChannelId = (await Settings.findOne({ where: { key: 'ban-log-kanal' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;
                    const embed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                        .setTitle('Kullanıcı Yasağı Kaldırıldı')
                        .addFields(
                            { name: 'Yasağı Kaldırılan Kullanıcı', value: bannedUser.toString(), inline: true },
                            { name: 'Yasağı Kaldıran Yetkili', value: interaction.user.toString(), inline: true },
                            { name: 'Sebep', value: reason }
                        )
                        .setTimestamp();
                    if (website) embed.setFooter({ text: `Ban Sistemi | ${website}` });
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply('Bu ID\'ye sahip yasaklı bir kullanıcı bulunamadı veya bir hata oluştu.');
        }
    },
};
