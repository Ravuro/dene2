// commands/araclar/toplu-rol-al.js
const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplu-rol-al')
        .setDescription('Bir roldeki üyelerin TÜM rollerini alır (sunucudan atılmış gibi yapar).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addRoleOption(option => option.setName('rol').setDescription('Hedeflenecek üyelerin sahip olduğu rol').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const role = interaction.options.getRole('rol');
        const members = await interaction.guild.members.fetch();
        const membersWithRole = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot && m.id !== interaction.guild.ownerId);

        if (membersWithRole.size === 0) {
            return interaction.editReply(`**${role.name}** rolüne sahip kimse bulunamadı.`);
        }

        let successCount = 0;
        let failCount = 0;

        for (const member of membersWithRole.values()) {
            try {
                // @everyone rolü hariç tüm rolleri al
                await member.roles.set([], 'Toplu rol alma komutu ile tüm rolleri alındı.');
                successCount++;
            } catch (err) {
                console.error(`Rol alınamadı: ${member.user.tag}`, err);
                failCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        }

        await interaction.editReply(
            `İşlem tamamlandı. **${membersWithRole.size}** kişiden;\n` +
            `✅ **${successCount}** üyenin tüm rolleri başarıyla alındı.\n` +
            `❌ **${failCount}** üyenin rolleri alınamadı (yetki sorunu).`
        );
    },
};
