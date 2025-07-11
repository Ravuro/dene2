// commands/yonetim/mesai.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Mesai, Settings } = require('../../database');
const { Op, fn, col } = require('sequelize');

// Milisaniyeyi okunabilir formata çeviren yardımcı fonksiyon
function formatTotalDuration(ms) {
    if (ms < 1000) return '0 saniye';
    const time = {
        gün: Math.floor(ms / 86400000),
        saat: Math.floor(ms / 3600000) % 24,
        dakika: Math.floor(ms / 60000) % 60,
    };
    return Object.entries(time).filter(val => val[1] !== 0).map(([key, val]) => `${val} ${key}`).join(', ') || '0 dakika';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mesai')
        .setDescription('Gelişmiş, loglu mesai takip sistemi.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addSubcommand(subcommand => subcommand.setName('başlat').setDescription('Mesainizi başlatır.'))
        .addSubcommand(subcommand => subcommand.setName('bitir').setDescription('Mesainizi bitirir.'))
        .addSubcommand(subcommand => subcommand.setName('liste').setDescription('En çok mesai yapan yetkilileri listeler.'))
        .addSubcommand(subcommand => subcommand.setName('log-kanal').setDescription('Mesai loglarının gönderileceği kanalı ayarlar.')
            .addChannelOption(option => option.setName('kanal').setDescription('Log kanalı').setRequired(true))),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;

        const [mesai, created] = await Mesai.findOrCreate({ where: { userId: user.id } });
        const logChannelId = (await Settings.findOne({ where: { key: 'mesaiLog' } }))?.value;
        const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;

        if (subcommand === 'başlat') {
            if (mesai.onShift) {
                return interaction.editReply('Zaten bir mesai başlatmışsınız!');
            }
            await mesai.update({ onShift: true, startTime: new Date() });
            await interaction.editReply('Mesainiz başarıyla başlatıldı. Log kanalına bildirim gönderildi.');

            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ name: 'Mesai Başlatıldı', iconURL: user.displayAvatarURL() })
                    .setDescription(`${user} departmanındaki mesaisine başladı.`)
                    .addFields({ name: 'Başlangıç Saati', value: `<t:${Math.floor(mesai.startTime.getTime() / 1000)}:F>` });
                if (website) embed.setFooter({ text: website });
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        } 
        else if (subcommand === 'bitir') {
            if (!mesai.onShift) {
                return interaction.editReply('Bitirecek aktif bir mesainiz bulunmuyor.');
            }
            const endTime = new Date();
            const duration = endTime.getTime() - mesai.startTime.getTime();
            await mesai.update({ onShift: false, totalTime: mesai.totalTime + duration });
            await interaction.editReply('Mesainiz başarıyla bitirildi. Log kanalına bildirim gönderildi.');

            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setAuthor({ name: 'Mesai Bitirildi', iconURL: user.displayAvatarURL() })
                    .setDescription(`${user} departmanındaki mesaisini bitirdi.`)
                    .addFields(
                        { name: 'Başlangıç Saati', value: `<t:${Math.floor(mesai.startTime.getTime() / 1000)}:F>` },
                        { name: 'Bitiş Saati', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>` },
                        { name: 'Toplam Süre', value: formatTotalDuration(duration) }
                    );
                if (website) embed.setFooter({ text: website });
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        }
        else if (subcommand === 'liste') {
            const topMesai = await Mesai.findAll({
                where: { totalTime: { [Op.gt]: 0 } },
                order: [['totalTime', 'DESC']],
                limit: 15
            });
            if (topMesai.length === 0) return interaction.editReply('Listelenecek mesai verisi bulunmuyor.');

            const description = topMesai.map((m, index) => {
                return `**${index + 1}.** <@${m.userId}> - **Toplam Süre:** ${formatTotalDuration(m.totalTime)}`;
            }).join('\n');
            const embed = new EmbedBuilder().setTitle('Mesai Liderlik Tablosu').setDescription(description).setColor('#3498DB');
            await interaction.editReply({ embeds: [embed] });
        }
        else if (subcommand === 'log-kanal') {
            const kanal = interaction.options.getChannel('kanal');
            await Settings.upsert({ key: 'mesaiLog', value: kanal.id });
            await interaction.editReply(`Mesai log kanalı <#${kanal.id}> olarak ayarlandı.`);
        }
    },
};
