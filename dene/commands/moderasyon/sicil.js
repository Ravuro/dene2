// commands/moderasyon/sicil.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Punishment } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicil')
        .setDescription('Bir kullanıcının ceza geçmişini (sicilini) gösterir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Sicili görüntülenecek kullanıcı')
                .setRequired(true)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanıcı');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const records = await Punishment.findAll({
                where: { userId: targetUser.id },
                order: [['createdAt', 'DESC']],
            });

            if (records.length === 0) {
                const cleanEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`${targetUser.username} Sicil Kaydı`)
                    .setDescription('Bu kullanıcının sicili tertemiz! Hiçbir ceza kaydı bulunamadı.')
                    .setThumbnail(targetUser.displayAvatarURL());
                return interaction.editReply({ embeds: [cleanEmbed] });
            }

            const description = records.map((p, index) => {
                const timestamp = `<t:${Math.floor(new Date(p.createdAt).getTime() / 1000)}:R>`;
                return `**${index + 1}. Ceza (${p.type.toUpperCase()})**\n` +
                       `> **Sebep:** ${p.reason}\n` +
                       `> **Yetkili:** <@${p.moderatorId}>\n` +
                       `> **Tarih:** ${timestamp}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle(`${targetUser.username} Sicil Kayıtları`)
                .setDescription(description)
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: `Toplam ${records.length} ceza kaydı bulundu.` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Sicil komutunda hata:", error);
            await interaction.editReply({ content: 'Kullanıcının sicil bilgileri alınırken bir hata oluştu.' });
        }
    },
};
