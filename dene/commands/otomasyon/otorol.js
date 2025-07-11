// commands/otomasyon/otorol.js
// Bu dosyayı "commands" içinde yeni bir "otomasyon" klasörü oluşturup içine koyun.
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otorol')
        .setDescription('Yeni üyelere otomatik rol verme sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('ayarla')
                .setDescription('Otorol olarak verilecek rolü ayarlar.')
                .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('kapat')
                .setDescription('Otorol sistemini kapatır.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'ayarla') {
            const rol = interaction.options.getRole('rol');
            // Hem rolü hem de sistemi aktif eden durumu kaydedelim.
            await Settings.upsert({ key: 'otorolRole', value: rol.id });
            await Settings.upsert({ key: 'otorolStatus', value: true });
            await interaction.editReply(`Otorol sistemi aktif edildi. Yeni üyelere artık <@&${rol.id}> rolü verilecek.`);
        } else if (subcommand === 'kapat') {
            await Settings.upsert({ key: 'otorolStatus', value: false });
            await interaction.editReply('Otorol sistemi başarıyla kapatıldı.');
        }
    },
};
