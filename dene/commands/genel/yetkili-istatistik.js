// commands/genel/yetkili-istatistik.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Registrations, Tickets, Mesai } = require('../../database'); // Gerekli modelleri import ediyoruz
const { Op } = require('sequelize');

// Milisaniyeyi okunabilir bir süreye çeviren yardımcı fonksiyon
function formatDuration(ms) {
    if (ms < 0) ms = -ms;
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor(((ms % 86400000) % 3600000) / 60000);

    const parts = [];
    if (days > 0) parts.push(`${days}g`);
    if (hours > 0) parts.push(`${hours}s`);
    if (minutes > 0) parts.push(`${minutes}dk`);

    return parts.join(' ') || '0s 0dk';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yetkili-istatistik')
        .setDescription('Bir yetkilinin sunucudaki performans istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers) // Sadece moderatörler ve üstü görebilir
        .addUserOption(option =>
            option.setName('yetkili')
                .setDescription('İstatistikleri görüntülenecek yetkili (boş bırakılırsa sizin istatistiğiniz gösterilir)')
                .setRequired(false)),
    async execute(interaction, client) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('yetkili') || interaction.user; // Eğer kullanıcı belirtilmezse komutu kullananı al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: 'Belirtilen kullanıcı sunucuda bulunamadı.', flags: MessageFlags.Ephemeral });
        }

        // 1. Yaptığı Kayıt Sayısı
        const totalRegistrations = await Registrations.count({
            where: { staffId: targetUser.id }
        });

        // 2. Baktığı Ticket Sayısı
        // Ticket modelinde 'claimedBy' alanı, ticket'ı üstlenen yetkiliyi tutar.
        const totalTicketsClaimed = await Tickets.count({
            where: { claimedBy: targetUser.id }
        });

        // 3. Toplam Ses Süresi (Placeholder - Gerçek entegrasyon için ek geliştirme gerekir)
        // Mesai sistemi (Mesai modeli) toplam süreyi tutuyor, onu kullanabiliriz.
        const mesaiData = await Mesai.findOne({ where: { userId: targetUser.id } });
        const totalVoiceTimeMs = mesaiData ? mesaiData.totalTime : 0;
        const formattedVoiceTime = formatDuration(totalVoiceTimeMs);

        // Son Güncelleme Zamanı (Şimdilik komutun çalıştığı zamanı kullanabiliriz)
        const lastUpdatedTimestamp = Math.floor(Date.now() / 1000);

        const embed = new EmbedBuilder()
            .setColor('#5865F2') // Discord mavisi teması
            .setAuthor({ name: `${targetUser.tag} | Yetkili İstatistikleri`, iconURL: targetUser.displayAvatarURL() })
            .setDescription('etkilesimsizhayat İstatistikleri') // Görseldeki başlık
            .addFields(
                { name: 'Baktığı Ticket Sayısı', value: `\`${totalTicketsClaimed}\` adet`, inline: true },
                { name: 'Yaptığı Kayıt Sayısı', value: `\`${totalRegistrations}\` adet`, inline: true },
                { name: 'Toplam Ses Süresi', value: formattedVoiceTime, inline: true }
            )
            .setFooter({ text: `Yetkili İstatistik Sistemi • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
            .setTimestamp();

        // Görseldeki "Haftalık Kayıtları Göster" butonu için bir placeholder
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('yetkili_stats_weekly_records') // Özel ID
                    .setLabel('Haftalık Kayıtları Göster')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true) // Şimdilik devre dışı, ek geliştirme gerektirir
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};
