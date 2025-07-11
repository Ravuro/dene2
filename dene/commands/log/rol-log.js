// commands/log/rol-log.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { RoleLog } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-log')
        .setDescription('Bir kullanıcının rol geçmişini gösterir.')
        // Sadece moderatörler ve üstü yetkiye sahip olanlar görebilir.
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Geçmişi görüntülenecek kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const user = interaction.options.getUser('kullanıcı');

        try {
            const logs = await RoleLog.findAll({
                where: { userId: user.id },
                order: [['createdAt', 'DESC']],
                limit: 20, // Son 20 kaydı göster
            });

            if (logs.length === 0) {
                return interaction.editReply({ content: `**${user.tag}** adlı kullanıcının rol geçmişi bulunamadı.` });
            }

            const description = logs.map(log => {
                const actionText = log.action === 'verildi' ? '✅ Verildi' : '❌ Alındı';
                const timestamp = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
                return `**Rol:** <@&${log.roleId}>\n**İşlem:** ${actionText}\n**Yetkili:** <@${log.moderatorId}>\n**Tarih:** ${timestamp}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle(`${user.username} Rol Geçmişi`)
                .setColor('#2b2d31')
                .setDescription(description)
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `Toplam ${logs.length} kayıt gösteriliyor.` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Rol-log komutunda hata:", error);
            await interaction.editReply({ content: 'Rol geçmişi alınırken bir hata oluştu.' });
        }
    },
};
