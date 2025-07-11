// commands/otomasyon/hgbb.js
// Bu dosyayı "commands/otomasyon" klasörüne koyun.
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hgbb')
        .setDescription('Hoş geldin-güle güle mesaj sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('kanal-ayarla')
                .setDescription('HG-BB mesajlarının gönderileceği kanalı ayarlar.')
                .addChannelOption(option => option.setName('kanal').setDescription('Mesaj kanalı').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('kapat')
                .setDescription('HG-BB sistemini kapatır.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'kanal-ayarla') {
            const kanal = interaction.options.getChannel('kanal');
            await Settings.upsert({ key: 'hgbbChannel', value: kanal.id });
            await interaction.editReply(`Hoş geldin-güle güle kanalı <#${kanal.id}> olarak ayarlandı. Sistem artık aktif.`);
        } else if (subcommand === 'kapat') {
            // Kanal ayarını silerek sistemi kapatabiliriz.
            await Settings.destroy({ where: { key: 'hgbbChannel' } });
            await interaction.editReply('HG-BB sistemi başarıyla kapatıldı.');
        }
    },
};
