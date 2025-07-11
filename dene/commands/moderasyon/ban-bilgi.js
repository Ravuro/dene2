// commands/moderasyon/ban-bilgi.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Punishment } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-bilgi')
        .setDescription('ID ile bir kullanıcının yasaklanma bilgisini sorgular.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addStringOption(option => option.setName('kullanici-id').setDescription('Yasak bilgisi sorgulanacak kullanıcının ID\'si').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const userId = interaction.options.getString('kullanici-id');

        try {
            const ban = await interaction.guild.bans.fetch(userId);
            const user = ban.user;
            const reason = ban.reason || 'Sebep belirtilmemiş.';

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setAuthor({ name: `${user.tag} | Ban Bilgisi`, iconURL: user.displayAvatarURL() })
                .addFields(
                    { name: 'Banlanan Kullanıcı', value: user.toString() },
                    { name: 'Yasaklanma Sebebi', value: `\`\`\`${reason}\`\`\`` }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`**${userId}** ID'li yasaklı bir kullanıcı bulunamadı.`);
        }
    },
};
