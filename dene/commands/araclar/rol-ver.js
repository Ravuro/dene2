// commands/araclar/rol-ver.js
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('Belirtilen kişilere rol verir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
        .addStringOption(option => option.setName('kisiler').setDescription('Rol verilecek kişiler (etiketleyerek birden fazla seçin)').setRequired(true)),
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

            await member.roles.add(role).then(() => successCount++).catch(() => failCount++);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await interaction.editReply(
            `İşlem tamamlandı. **${userIds.length}** kişiden;\n` +
            `✅ **${successCount}** kişiye rol başarıyla verildi.\n` +
            `❌ **${failCount}** kişiyle işlem yapılamadı (kullanıcı bulunamadı veya yetki sorunu).`
        );
    }
};
