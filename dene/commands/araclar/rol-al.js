// commands/araclar/rol-al.js
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-al')
        .setDescription('Belirtilen kişilerden rol alır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addRoleOption(option => option.setName('rol').setDescription('Alınacak rol').setRequired(true))
        .addStringOption(option => option.setName('kisiler').setDescription('Rol alınacak kişiler (etiketleyerek birden fazla seçin)').setRequired(true)),
    async execute(interaction) {
        const role = interaction.options.getRole('rol');
        const usersString = interaction.options.getString('kisiler');
        const userIds = usersString.match(/\d{17,19}/g) || [];

        if (userIds.length === 0) {
            return interaction.reply({ content: 'Geçerli bir kullanıcı belirtmediniz. Lütfen kullanıcıları etiketleyin.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let successCount = 0;
        let failCount = 0;

        for (const userId of userIds) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
                failCount++;
                continue;
            }

            await member.roles.remove(role).then(() => successCount++).catch(() => failCount++);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await interaction.editReply(
            `İşlem tamamlandı. **${userIds.length}** kişiden;\n` +
            `✅ **${successCount}** kişiden rol başarıyla alındı.\n` +
            `❌ **${failCount}** kişiyle işlem yapılamadı (kullanıcı bulunamadı veya yetki sorunu).`
        );
    }
};
