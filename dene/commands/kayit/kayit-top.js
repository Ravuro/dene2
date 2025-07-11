// commands/kayit/kayit-top.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { Registrations, Settings } = require('../../database');
const { Op, fn, col } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit-top')
        .setDescription('Bu ay en çok kayıt yapan yetkilileri listeler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles), // Sadece yetkililer görebilir
    async execute(interaction) {
        await interaction.deferReply();

        const ayinBasi = new Date();
        ayinBasi.setDate(1);
        ayinBasi.setHours(0, 0, 0, 0);

        try {
            const stats = await Registrations.findAll({
                where: {
                    guildId: interaction.guild.id,
                    createdAt: { [Op.gte]: ayinBasi }
                },
                group: ['staffId'],
                attributes: ['staffId', [fn('COUNT', col('staffId')), 'kayitSayisi']],
                order: [[fn('COUNT', col('staffId')), 'DESC']],
                limit: 15,
            });

            if (stats.length === 0) {
                return interaction.editReply('Bu ay henüz hiç kayıt yapılmamış.');
            }

            const description = stats.map((stat, index) => {
                const kayitSayisi = stat.get('kayitSayisi');
                return `**${index + 1}. Yetkili:** <@${stat.staffId}> - **Kayıt Sayısı:** ${kayitSayisi}`;
            }).join('\n');

            const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;
            const embed = new EmbedBuilder()
                .setTitle('Bu Ayın En Çok Kayıt Yapan Yetkilileri')
                .setColor('#FFD700')
                .setAuthor({ name: `${interaction.guild.name} | Kayıt Sistemi`, iconURL: interaction.guild.iconURL() })
                .setDescription(description)
                .setTimestamp();

            if (website) embed.setFooter({ text: `Kayıt Sistemi | ${website}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Kayıt-top komutunda hata:", error);
            await interaction.editReply({ content: "İstatistikler alınırken bir hata oluştu.", flags: MessageFlags.Ephemeral });
        }
    },
};
