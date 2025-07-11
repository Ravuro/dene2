// commands/destek/ticket-stats.js
// Bu dosyayı "commands/destek" klasörüne koyun.
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { TicketRatings } = require('../../database');
const { Op } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-stats')
        .setDescription('Destek yetkililerinin performans istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const ratings = await TicketRatings.findAll({
            where: {
                staffId: { [Op.ne]: null } // Sadece bir yetkiliye atanmış puanları al
            }
        });

        if (ratings.length === 0) {
            return interaction.editReply('Henüz hiçbir yetkili için puanlama verisi bulunmuyor.');
        }

        const stats = new Map();
        for (const r of ratings) {
            if (!stats.has(r.staffId)) {
                stats.set(r.staffId, { totalRating: 0, count: 0 });
            }
            const staffData = stats.get(r.staffId);
            staffData.totalRating += r.rating;
            staffData.count++;
        }

        const leaderboard = Array.from(stats.entries()).map(([staffId, data]) => ({
            staffId,
            average: (data.totalRating / data.count).toFixed(2),
            count: data.count,
        }));

        leaderboard.sort((a, b) => b.average - a.average || b.count - a.count);

        const description = leaderboard.map((entry, index) => {
            return `**${index + 1}.** <@${entry.staffId}> - **${entry.average}** ⭐ (${entry.count} değerlendirme)`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('Destek Ekibi Performans Tablosu')
            .setColor('#FFD700')
            .setDescription(description)
            .setFooter({ text: 'Sıralama, puan ortalamasına ve değerlendirme sayısına göre yapılmıştır.' });

        await interaction.editReply({ embeds: [embed] });
    },
};
