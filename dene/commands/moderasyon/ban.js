// commands/moderasyon/ban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Punishment, Settings } = require('../../database');
const { checkPermission } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir kullanıcıyı sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addUserOption(option => option.setName('kullanıcı').setDescription('Yasaklanacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Yasaklama sebebi').setRequired(false)),
    async execute(interaction, client) {
        // Komutun en başında dinamik yetki kontrolü yap
        if (!await checkPermission(interaction, 'ban-yetki')) return;

        // deferReply'ı yetki kontrolünden sonra çağır
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Hiyerarşi ve diğer kontroller
        if (!targetMember) {
            return interaction.editReply({ content: 'Kullanıcı bu sunucuda bulunamadı.' });
        }
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({ content: 'Kendinizi yasaklayamazsınız.' });
        }
        if (targetUser.id === client.user.id) {
            return interaction.editReply({ content: 'Beni yasaklayamazsınız.' });
        }
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({ content: 'Bu kullanıcının rolü sizden daha yüksek veya aynı seviyede.' });
        }
        if (!targetMember.bannable) {
            return interaction.editReply({ content: 'Bu kullanıcıyı yasaklamak için yetkim yok.' });
        }

        // Yasaklama işlemi
        try {
            await targetUser.send(`**${interaction.guild.name}** sunucusundan yasaklandınız.\n**Sebep:** ${reason}`).catch(() => {});
            await interaction.guild.bans.create(targetUser.id, { reason });
            
            await Punishment.create({
                userId: targetUser.id, moderatorId: interaction.user.id,
                type: 'ban', reason: reason, isActive: true
            });

            await interaction.editReply(`**${targetUser.tag}** başarıyla yasaklandı.`);

            const logChannelId = (await Settings.findOne({ where: { key: 'ban-log-kanal' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;
                    const embed = new EmbedBuilder()
                        .setColor('#E74C3C')
                        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                        .setTitle('Kullanıcı Yasaklandı')
                        .addFields(
                            { name: 'Yasaklanan Kullanıcı', value: targetUser.toString(), inline: true },
                            { name: 'Yasaklayan Yetkili', value: interaction.user.toString(), inline: true },
                            { name: 'Sebep', value: reason }
                        )
                        .setTimestamp();
                    if (website) embed.setFooter({ text: `Ban Sistemi | ${website}` });
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: 'Kullanıcı yasaklanırken bir hata oluştu.', flags: MessageFlags.Ephemeral });
        }
    },
};
