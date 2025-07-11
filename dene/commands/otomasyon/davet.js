// commands/otomasyon/davet.js
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('davet')
        .setDescription('Davet takip sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('kanal-ayarla')
                .setDescription('Davet loglarının gönderileceği kanalı ayarlar.')
                .addChannelOption(option => option.setName('kanal').setDescription('Log kanalı').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('kapat')
                .setDescription('Davet takip sistemini kapatır.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'kanal-ayarla') {
            const kanal = interaction.options.getChannel('kanal');
            await Settings.upsert({ key: 'davetLogChannel', value: kanal.id });
            await interaction.editReply(`Davet log kanalı <#${kanal.id}> olarak ayarlandı. Sistem artık aktif.`);
        } else if (subcommand === 'kapat') {
            await Settings.destroy({ where: { key: 'davetLogChannel' } });
            await interaction.editReply('Davet takip sistemi başarıyla kapatıldı.');
        }
    },
};
