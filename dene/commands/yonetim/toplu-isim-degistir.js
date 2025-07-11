// commands/yonetim/toplu-isim-degistir.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplu-isim-değiştir')
        .setDescription('Belirtilen roldeki tüm üyelerin takma adını değiştirir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('İsimleri değiştirilecek rol')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('isim')
                .setDescription('Uygulanacak yeni takma ad. Üye ismini kullanmak için {üye} yazın.')
                .setRequired(true)),
    async execute(interaction) {
        const role = interaction.options.getRole('rol');
        const newNameTemplate = interaction.options.getString('isim');

        await interaction.deferReply({ ephemeral: true });

        try {
            // Roldeki üyeleri çek
            const members = await interaction.guild.members.fetch();
            const membersWithRole = members.filter(member => member.roles.cache.has(role.id) && !member.user.bot);

            if (membersWithRole.size === 0) {
                return interaction.editReply(`**${role.name}** rolüne sahip kimse bulunamadı.`);
            }

            let changedCount = 0;
            let failedCount = 0;

            await interaction.editReply(`**${role.name}** rolündeki **${membersWithRole.size}** üyenin ismi değiştiriliyor...`);

            for (const member of membersWithRole.values()) {
                // {üye} değişkenini kullanıcının gerçek adıyla değiştir
                const newNickname = newNameTemplate.replace('{üye}', member.user.username);
                
                await member.setNickname(newNickname, `Toplu isim değiştirme: ${interaction.user.tag}`)
                    .then(() => changedCount++)
                    .catch(() => failedCount++);
                
                // API limitlerini zorlamamak için küçük bir gecikme
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('İşlem Tamamlandı')
                .setDescription(`**${role.name}** rolündeki üyelerin isimleri değiştirildi.`)
                .addFields(
                    { name: 'Başarılı', value: `${changedCount} üye`, inline: true },
                    { name: 'Başarısız', value: `${failedCount} üye`, inline: true }
                )
                .setTimestamp();

            await interaction.followUp({ embeds: [resultEmbed], ephemeral: true });

        } catch (error) {
            console.error("Toplu isim değiştirme hatası:", error);
            await interaction.editReply({ content: 'İşlem sırasında beklenmedik bir hata oluştu.' });
        }
    },
};
