// commands/moderasyon/sil.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Belirtilen miktarda mesajı kanaldan siler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addIntegerOption(option =>
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('miktar');

        await interaction.channel.bulkDelete(amount, true).then(async messages => {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Mesajlar Silindi')
                .setDescription(`**${messages.size}** adet mesaj bu kanaldan başarıyla silindi.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }).catch(async error => {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Hata')
                .setDescription('Mesajlar silinirken bir hata oluştu. Muhtemelen 14 günden eski mesajları silmeye çalıştınız.');
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        });
    },
};
